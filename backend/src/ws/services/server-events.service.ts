import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { NotificationService } from "@/modules/telegram-bot/notification.service";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable } from "@nestjs/common";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import type { IServer } from "@shared/types/server/server.types";

@Injectable()
export class ServerEventsService {
  // Tracks the last Telegram-notified error per server to avoid spamm
  private readonly lastErrorNotify = new Map<
    string,
    { errorType: string; at: number }
  >();
  private static readonly ERROR_NOTIFY_DEDUP_MS = 60_000;

  constructor(
    private readonly broadcast: ServerBroadcastService,
    private readonly notificationService: NotificationService,
    private readonly serversRepo: ServersRepository,
    private readonly bus: ExtensionEventBus,
  ) {}

  emitServerList(servers: IServer[]) {
    const payload = servers.map((server) => ({
      id: server.id,
      name: server.name,
      status: server.status,
      folderId: server.folderId ?? null,
      blueprintId: server.blueprintId,
      variables: server.variables,
    }));
    this.broadcast.emitServersList(payload);
  }

  emitServerStatus(serverId: string, status: any) {
    this.broadcast.emitServerStatusUpdate(serverId, status);

    const server = this.serversRepo.findById(serverId);
    if (server) {
      this.notificationService.sendServerStatusNotification(
        serverId,
        server.name,
        status.status,
      );
    }
  }

  emitServerQueryData(serverId: string, queryData: any) {
    this.broadcast.emitServerQueryData(serverId, queryData);
  }

  emitServerLog(serverId: string, logEntry: IInstanceLog) {
    this.broadcast.emitServerLog(serverId, logEntry);
    this.bus.publish("server.log", {
      serverId,
      line: {
        type:
          logEntry.type === "stdout" || logEntry.type === "stderr"
            ? logEntry.type
            : "kubek",
        timestamp: logEntry.timestamp,
        line: logEntry.line,
        data: logEntry.data,
      },
    });
  }

  emitServerStarted(serverId: string, instanceInfo: any) {
    this.broadcast.emitServerStatusUpdate(serverId, {
      status: "running",
      instance: instanceInfo,
    });
    this.bus.publish("server.started", {
      serverId,
      pid: instanceInfo?.pid,
      port: instanceInfo?.port,
    });
  }

  emitServerStopped(serverId: string, instanceInfo: any) {
    this.broadcast.emitServerStatusUpdate(serverId, {
      status: "stopped",
      instance: instanceInfo,
    });
    this.bus.publish("server.stopped", {
      serverId,
      exitCode: instanceInfo?.exitCode ?? null,
    });
  }

  emitServerCrashed(serverId: string, error: any) {
    this.broadcast.emitServerStatusUpdate(serverId, {
      status: "crashed",
      error,
    });
    this.bus.publish("server.crashed", {
      serverId,
      exitCode: error?.exitCode ?? null,
      restartAttempts: error?.restartAttempts ?? 0,
    });
  }

  emitServerError(serverId: string, errorData: any) {
    this.broadcast.emitServerError(serverId, errorData);
    this.maybeNotifyError(serverId, errorData);
    this.bus.publish("server.error", {
      serverId,
      errorType: errorData?.errorType ?? "unknown",
      severity: errorData?.severity ?? "low",
    });
  }

  /** Signal that a previously emitted error no longer applies */
  emitServerErrorResolved(serverId: string, errorType: string) {
    this.broadcast.emitServerErrorResolved(serverId, errorType);
    // Clear the dedup record so a future recurrence notifies again immediately
    this.lastErrorNotify.delete(serverId);
  }

  /** Send a Telegram alert for severe errors, deduplicated per server/errorType */
  private maybeNotifyError(serverId: string, errorData: any) {
    const severity = errorData?.severity;
    if (severity !== "critical" && severity !== "high") return;

    const errorType = errorData?.errorType ?? "unknown";
    const now = Date.now();
    const last = this.lastErrorNotify.get(serverId);
    if (
      last &&
      last.errorType === errorType &&
      now - last.at < ServerEventsService.ERROR_NOTIFY_DEDUP_MS
    ) {
      return;
    }
    this.lastErrorNotify.set(serverId, { errorType, at: now });

    const server = this.serversRepo.findById(serverId);
    if (server) {
      this.notificationService.sendServerErrorNotification(
        serverId,
        server.name,
        errorType,
      );
    }
  }
}
