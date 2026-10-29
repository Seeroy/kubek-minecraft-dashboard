import { AppEventsService } from "@/core/events/app-events.service";
import type { AppEventMap } from "@/core/events/app-events.types";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { Injectable, OnModuleInit } from "@nestjs/common";
import type { TaskNotificationParams } from "@shared/types/notification.types";
import { ServerStatus } from "@shared/types/server/server.types";
import { type ITask, TaskStatus, TaskType } from "@shared/types/task.types";
import { AccessArea } from "@shared/access/areas";
import { NotificationsService } from "./notifications.service";

const ERROR_DEDUP_MS = 60_000;
// A dead storage fails every upload, one alert an hour is enough
const STORAGE_DEDUP_MS = 60 * 60_000;
const SEVERE_ERRORS = ["critical", "high"];
// Starting and stopping are transitions, not news
const ROUTINE_STATUSES: string[] = [ServerStatus.RUNNING, ServerStatus.STOPPED];

// Pruning and downloads fail quietly into the journal, these need a human
const ALERTING_BACKUP_OPS = ["create", "upload", "restore"];

// Steps of an open dialog, the user is watching them already
const SILENT_TASKS: string[] = [TaskType.MODPACK_INSPECT];

const TASK_KINDS = {
  [TaskStatus.SUCCESS]: "task.succeeded",
  [TaskStatus.FAILED]: "task.failed",
  [TaskStatus.CANCELLED]: "task.cancelled",
} as const;

/** Turns domain events into notifications */
@Injectable()
export class NotificationRulesService implements OnModuleInit {
  private readonly lastError = new Map<
    string,
    { errorType: string; at: number }
  >();
  private readonly storageAlertedAt = new Map<string, number>();

  constructor(
    private readonly events: AppEventsService,
    private readonly notifications: NotificationsService,
    private readonly accounts: AccountsService,
    private readonly servers: ServersRepository,
  ) {}

  onModuleInit(): void {
    this.events.on("task.finished", ({ task }) => this.onTaskFinished(task));
    this.events.on("server.status_changed", (e) => this.onServerStatus(e));
    this.events.on("server.error", (e) => this.onServerError(e));
    this.events.on("server.error_resolved", ({ serverId }) => {
      this.lastError.delete(serverId);
    });
    this.events.on("user.login", (e) => this.onLogin(e));
    this.events.on("auth.locked", (e) => this.onLocked(e));
    this.events.on("backup.operation", (e) => this.onBackupOperation(e));
    this.events.on("storage.unreachable", (e) => this.onStorageUnreachable(e));
  }

  private onTaskFinished(task: ITask): void {
    if (!task.ownerId || SILENT_TASKS.includes(task.type)) return;
    const kind = TASK_KINDS[task.status as keyof typeof TASK_KINDS];
    if (!kind) return;
    const params: TaskNotificationParams = {
      taskType: task.type,
      durationMs: Math.max(0, task.updatedAt - task.createdAt),
      serverId: task.meta?.serverId,
      serverName: task.meta?.serverName,
      pluginName: task.meta?.pluginName,
      error: task.error?.message,
    };
    this.notifications.notify({
      kind,
      params,
      audience: { userId: task.ownerId },
    });
  }

  private onServerStatus({
    serverId,
    serverName,
    status,
  }: AppEventMap["server.status_changed"]): void {
    const audience = {
      serverId,
      area: AccessArea.POWER,
      level: "read",
    } as const;
    if (status === ServerStatus.CRASHED) {
      this.notifications.notify({
        kind: "server.crashed",
        params: { serverId, serverName },
        audience,
      });
    } else if (ROUTINE_STATUSES.includes(status)) {
      this.notifications.notify({
        kind: "server.status",
        params: { serverId, serverName, status },
        audience,
      });
    }
  }

  private onServerError(e: AppEventMap["server.error"]): void {
    if (!SEVERE_ERRORS.includes(e.severity)) return;
    const now = Date.now();
    const last = this.lastError.get(e.serverId);
    if (last?.errorType === e.errorType && now - last.at < ERROR_DEDUP_MS) {
      return;
    }
    this.lastError.set(e.serverId, { errorType: e.errorType, at: now });
    this.notifications.notify({
      kind: "server.error",
      params: {
        serverId: e.serverId,
        serverName: e.serverName,
        errorType: e.errorType,
      },
      audience: {
        serverId: e.serverId,
        area: AccessArea.POWER,
        level: "read",
      },
    });
  }

  private onLogin({ userId, ip }: AppEventMap["user.login"]): void {
    const user = this.accounts.findById(userId);
    if (!user) return;
    this.notifications.notify({
      kind: "auth.login",
      params: { username: user.username, ip },
      audience: { userId },
    });
  }

  private onLocked(e: AppEventMap["auth.locked"]): void {
    const userId =
      e.userId ??
      (e.username ? this.accounts.findByUsername(e.username)?.id : undefined);
    if (!userId) return;
    this.notifications.notify({
      kind: "auth.locked",
      params: { ip: e.ip, reason: e.policy, retryAfterSec: e.retryAfterSec },
      audience: { userId },
    });
  }

  private onBackupOperation(e: AppEventMap["backup.operation"]): void {
    if (
      e.status !== "failed" ||
      !e.serverId ||
      !ALERTING_BACKUP_OPS.includes(e.op)
    )
      return;
    const server = this.servers.findById(e.serverId);
    this.notifications.notify({
      kind: "backup.failed",
      params: {
        serverId: e.serverId,
        serverName: server?.name ?? e.serverId,
        backupName: e.backupName ?? "",
        op: e.op,
        error: e.message,
      },
      audience: {
        serverId: e.serverId,
        area: AccessArea.BACKUPS,
        level: "read",
      },
    });
  }

  private onStorageUnreachable(e: AppEventMap["storage.unreachable"]): void {
    const now = Date.now();
    const last = this.storageAlertedAt.get(e.storageId);
    if (last !== undefined && now - last < STORAGE_DEDUP_MS) return;
    this.storageAlertedAt.set(e.storageId, now);
    this.notifications.notify({
      kind: "storage.unreachable",
      params: e,
      audience: { area: AccessArea.STORAGES, level: "manage" },
    });
  }
}
