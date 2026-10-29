import { Injectable } from "@nestjs/common";
import type {
  BackupJournalEntry,
  BackupJournalOp,
} from "@shared/types/backup.types";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../../database/sqlite.provider";

export type JournalInput = Omit<
  BackupJournalEntry,
  "id" | "createdAt" | "username"
>;

@Injectable()
export class BackupJournalRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  create(input: JournalInput): void {
    this.sqlite.connection
      .prepare(
        `INSERT INTO backup_journal
        (id, serverId, backupId, backupName, storageId, op, status, message, bytes, durationMs, trigger, userId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.serverId,
        input.backupId,
        input.backupName,
        input.storageId,
        input.op,
        input.status,
        input.message,
        input.bytes,
        input.durationMs,
        input.trigger,
        input.userId,
        Date.now(),
      );
  }

  findByServer(
    serverId: string,
    opts: { limit: number; before?: { createdAt: number; id: string } },
  ): BackupJournalEntry[] {
    const rows = this.sqlite.connection
      .query(
        `SELECT j.*, u.username AS username FROM backup_journal j
        LEFT JOIN users u ON u.id = j.userId
        WHERE j.serverId = ? AND (j.createdAt < ? OR (j.createdAt = ? AND j.id < ?))
        ORDER BY j.createdAt DESC, j.id DESC LIMIT ?`,
      )
      .all(
        serverId,
        opts.before?.createdAt ?? Number.MAX_SAFE_INTEGER,
        opts.before?.createdAt ?? Number.MAX_SAFE_INTEGER,
        opts.before?.id ?? "",
        opts.limit,
      );
    return rows.map((row: any) => ({
      id: String(row.id),
      serverId: String(row.serverId),
      backupId: row.backupId ?? null,
      backupName: row.backupName ?? null,
      storageId: row.storageId ?? null,
      op: row.op as BackupJournalOp,
      status: row.status as BackupJournalEntry["status"],
      message: row.message ?? null,
      bytes: row.bytes ?? null,
      durationMs: row.durationMs ?? null,
      trigger: row.trigger as BackupJournalEntry["trigger"],
      userId: row.userId ?? null,
      username: row.username ?? null,
      createdAt: Number(row.createdAt),
    }));
  }

  deleteOlderThan(ts: number): number {
    return this.sqlite.connection
      .prepare("DELETE FROM backup_journal WHERE createdAt < ?")
      .run(ts).changes;
  }
}
