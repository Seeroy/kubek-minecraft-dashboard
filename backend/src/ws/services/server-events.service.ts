import { AppEventsService } from "@/core/events/app-events.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { toServerListItem } from "@/ws/server-list";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable } from "@nestjs/common";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import type {
  WsServerCrashInfo,
  WsServerErrorInfo,
  WsServerQueryInfo,
  WsServerStatusChange,
  WsServerStopInfo,
} from "@shared/types/ws/server-payloads.types";

@Injectable()
export class ServerEventsService {
  constructor(
    private readonly broadcast: ServerBroadcastService,
    private readonly serversRepo: ServersRepository,
    private readonly bus: ExtensionEventBus,
    private readonly events: AppEventsService,
  ) {}

  emitServerList(servers: IServer[]) {
    this.broadcast.emitServersList(servers.map(toServerListItem));
  }

  emitServerStatus(serverId: string, status: WsServerStatusChange) {
    this.broadcast.emitServerStatusUpdate(serverId, status);

    // Stopped and crashed get their own events below
    if (status.status === ServerStatus.RUNNING) {
      this.bus.publish("server.started", { serverId });
    }

    const server = this.serversRepo.findById(serverId);
    if (server) {
      this.events.emit("server.status_changed", {
        serverId,
        serverName: server.name,
        status: status.status,
      });
    }
  }

  emitServerQueryData(serverId: string, queryData: WsServerQueryInfo) {
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

  emitServerStopped(serverId: string, instanceInfo: WsServerStopInfo) {
    this.broadcast.emitServerStatusUpdate(serverId, {
      // A crash keeps its status instead of flickering through stopped
      status: instanceInfo.crashed ? ServerStatus.CRASHED : ServerStatus.STOPPED,
      instance: instanceInfo,
    });
    this.bus.publish("server.stopped", {
      serverId,
      exitCode: instanceInfo.exitCode ?? null,
    });
  }

  emitServerCrashed(serverId: string, error: WsServerCrashInfo) {
    this.broadcast.emitServerStatusUpdate(serverId, {
      status: ServerStatus.CRASHED,
      error,
    });
    this.bus.publish("server.crashed", {
      serverId,
      exitCode: error.exitCode ?? null,
      restartAttempts: error.restartAttempts ?? 0,
    });
  }

  emitServerError(serverId: string, errorData: WsServerErrorInfo) {
    this.broadcast.emitServerError(serverId, errorData);
    const errorType = errorData.errorType ?? "unknown";
    const severity = errorData.severity ?? "low";
    this.bus.publish("server.error", { serverId, errorType, severity });
    const server = this.serversRepo.findById(serverId);
    if (server) {
      this.events.emit("server.error", {
        serverId,
        serverName: server.name,
        errorType,
        severity,
      });
    }
  }

  /** Signal that a previously emitted error no longer applies */
  emitServerErrorResolved(serverId: string, errorType: string) {
    this.broadcast.emitServerErrorResolved(serverId, errorType);
    this.events.emit("server.error_resolved", { serverId, errorType });
  }
}
