import type { IConfiguration } from "@/core/types/config";
import type { BackupJournalEntry } from "@shared/types/backup.types";
import type {
  CompanionEvent,
  CompanionStats,
} from "@shared/types/companion.types";
import type { ServerStatus } from "@shared/types/server/server.types";
import type { ITask } from "@shared/types/task.types";

/** Internal domain events, not exposed to extensions */
export interface AppEventMap {
  "task.finished": { task: ITask };
  "server.status_changed": {
    serverId: string;
    serverName: string;
    status: ServerStatus;
  };
  "server.error": {
    serverId: string;
    serverName: string;
    errorType: string;
    severity: string;
  };
  "server.error_resolved": { serverId: string; errorType: string };
  "user.login": { userId: string; ip: string | null };
  /** One session was revoked or logged out, its sockets have to go */
  "session.revoked": { userId: string; sessionId: string };
  /** Every session of the user except the kept one was revoked */
  "user.sessions_revoked": { userId: string; exceptSessionId?: string };
  /** Levels, roles, servers or admin flag changed, open sockets are stale */
  "user.access_changed": { userId: string };
  "user.deleted": { userId: string };
  /** A key was deleted or its access changed, its sockets have to go */
  "api_key.changed": { userId: string; keyId: string };
  /** Every finished backup operation, written to the backup journal */
  "backup.operation": Omit<BackupJournalEntry, "id" | "createdAt" | "username">;
  "server.deleted": { serverId: string };
  /** A remote storage call failed on the driver level */
  "storage.unreachable": {
    storageId: string;
    storageName: string;
    error: string;
  };
  /** FTP password changed or removed, drop the open FTP sessions */
  "account.ftp_password_changed": { userId: string };
  /** Panel settings were saved */
  "config.changed": { before: IConfiguration; after: IConfiguration };
  "auth.locked": {
    policy: string;
    userId?: string;
    username?: string;
    ip: string | null;
    retryAfterSec: number;
  };
  /** Stats snapshot from the Kubek Companion plugin */
  "companion.stats": { serverId: string; stats: CompanionStats };
  /** Player and countdown events from the plugin */
  "companion.events": { serverId: string; events: CompanionEvent[] };
  /** TPS stayed low for a while */
  "server.low_tps": { serverId: string; serverName: string; tps: number };
}

export type AppEventName = keyof AppEventMap;

export type AppEventHandler<K extends AppEventName> = (
  payload: AppEventMap[K],
) => void | Promise<void>;
