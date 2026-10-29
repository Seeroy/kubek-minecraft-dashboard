import { AppEventsService } from "@/core/events/app-events.service";
import { getErrorMessage } from "@/core/utils/error";
import { sanitizeBackupError } from "../backup-errors";
import { Injectable } from "@nestjs/common";
import type { BackupActor, BackupJournalOp } from "@shared/types/backup.types";

export interface OperationContext {
  serverId: string;
  backupId: string | null;
  backupName: string | null;
  storageId?: string | null;
  actor: BackupActor;
}

export interface OperationOutcome {
  bytes?: number;
  message?: string;
}

export const SYSTEM_ACTOR: BackupActor = { trigger: "system", userId: null };

export const userActor = (userId: string | undefined): BackupActor =>
  userId ? { trigger: "user", userId } : SYSTEM_ACTOR;

/** Runs a backup operation and reports how it went to the journal */
@Injectable()
export class BackupOperations {
  constructor(private readonly events: AppEventsService) {}

  async track<T>(
    op: BackupJournalOp,
    ctx: OperationContext,
    work: () => Promise<T>,
    outcome: (result: T) => OperationOutcome = () => ({}),
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await work();
      this.report(op, ctx, "success", startedAt, outcome(result));
      return result;
    } catch (err) {
      this.report(op, ctx, "failed", startedAt, {
        message: sanitizeBackupError(getErrorMessage(err)),
      });
      throw err;
    }
  }

  report(
    op: BackupJournalOp,
    ctx: OperationContext,
    status: "success" | "failed",
    startedAt: number,
    { bytes, message }: OperationOutcome = {},
  ): void {
    this.events.emit("backup.operation", {
      op,
      status,
      serverId: ctx.serverId,
      backupId: ctx.backupId,
      backupName: ctx.backupName,
      storageId: ctx.storageId ?? null,
      trigger: ctx.actor.trigger,
      userId: ctx.actor.userId,
      bytes: bytes ?? null,
      message: message ?? null,
      durationMs: Date.now() - startedAt,
    });
  }
}
