import { Injectable } from "@nestjs/common";
import {
  type INotification,
  NOTIFICATION_KINDS,
  type NotificationKind,
  type NotificationParamsMap,
} from "@shared/types/notification.types";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../sqlite.provider";

export interface NotificationCreateInput<K extends NotificationKind> {
  userId: string;
  kind: K;
  params: NotificationParamsMap[K];
}

/** Position in the newest-first list, ties on createdAt are broken by id */
export interface NotificationCursor {
  createdAt: number;
  id: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  create<K extends NotificationKind>(
    input: NotificationCreateInput<K>,
  ): INotification<K> {
    const { category, severity } = NOTIFICATION_KINDS[input.kind];
    const notification: INotification<K> = {
      id: randomUUID(),
      ...input,
      category,
      severity,
      readAt: null,
      createdAt: Date.now(),
    };
    this.sqlite.connection
      .prepare(
        `INSERT INTO notifications (id, userId, kind, params, readAt, createdAt)
        VALUES (?, ?, ?, ?, NULL, ?)`,
      )
      .run(
        notification.id,
        input.userId,
        input.kind,
        JSON.stringify(input.params),
        notification.createdAt,
      );
    return notification;
  }

  page(
    userId: string,
    opts: { limit: number; unreadOnly: boolean; after?: NotificationCursor },
  ): INotification[] {
    const where = ["userId = ?"];
    const params: (string | number)[] = [userId];
    if (opts.unreadOnly) where.push("readAt IS NULL");
    if (opts.after) {
      where.push("(createdAt < ? OR (createdAt = ? AND id < ?))");
      params.push(opts.after.createdAt, opts.after.createdAt, opts.after.id);
    }
    const rows = this.sqlite.connection
      .query(
        `SELECT * FROM notifications WHERE ${where.join(" AND ")}
        ORDER BY createdAt DESC, id DESC LIMIT ?`,
      )
      .all(...params, opts.limit);
    return rows.map((row) => this.deserialize(row));
  }

  unreadCount(userId: string): number {
    const row = this.sqlite.connection
      .query(
        "SELECT COUNT(*) AS c FROM notifications WHERE userId = ? AND readAt IS NULL",
      )
      .get(userId) as { c: number };
    return Number(row.c);
  }

  markRead(userId: string, id: string): boolean {
    const result = this.sqlite.connection
      .prepare(
        "UPDATE notifications SET readAt = ? WHERE userId = ? AND id = ? AND readAt IS NULL",
      )
      .run(Date.now(), userId, id);
    return result.changes > 0;
  }

  markAllRead(userId: string): number {
    return this.sqlite.connection
      .prepare(
        "UPDATE notifications SET readAt = ? WHERE userId = ? AND readAt IS NULL",
      )
      .run(Date.now(), userId).changes;
  }

  delete(userId: string, id: string): boolean {
    const result = this.sqlite.connection
      .prepare("DELETE FROM notifications WHERE userId = ? AND id = ?")
      .run(userId, id);
    return result.changes > 0;
  }

  /** Drops read entries older than readBefore and any entry older than anyBefore */
  prune(readBefore: number, anyBefore: number): number {
    return this.sqlite.connection
      .prepare(
        `DELETE FROM notifications
        WHERE (readAt IS NOT NULL AND createdAt < ?) OR createdAt < ?`,
      )
      .run(readBefore, anyBefore).changes;
  }

  private deserialize(row: any): INotification {
    const kind = row.kind as NotificationKind;
    // Unknown kinds come from a newer build after a downgrade
    const spec = NOTIFICATION_KINDS[kind] ?? NOTIFICATION_KINDS["task.failed"];
    return {
      id: String(row.id),
      userId: String(row.userId),
      kind,
      category: spec.category,
      severity: spec.severity,
      params: JSON.parse(String(row.params || "{}")),
      readAt: row.readAt ?? null,
      createdAt: Number(row.createdAt),
    };
  }
}
