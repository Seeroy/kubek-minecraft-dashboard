import { Injectable } from "@nestjs/common";
import type {
  NotificationCategory,
  NotificationChannel,
} from "@shared/types/notification.types";
import { SqliteProvider } from "../sqlite.provider";

/** Only overrides of the defaults are stored */
export interface NotificationPrefOverride {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
}

@Injectable()
export class NotificationPrefsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findByUser(userId: string): NotificationPrefOverride[] {
    const rows = this.sqlite.connection
      .query(
        "SELECT category, channel, enabled FROM notification_prefs WHERE userId = ?",
      )
      .all(userId) as {
      category: NotificationCategory;
      channel: NotificationChannel;
      enabled: number;
    }[];
    return rows.map((row) => ({ ...row, enabled: !!row.enabled }));
  }

  replace(userId: string, overrides: NotificationPrefOverride[]): void {
    const db = this.sqlite.connection;
    db.transaction(() => {
      db.prepare("DELETE FROM notification_prefs WHERE userId = ?").run(userId);
      const insert = db.prepare(
        "INSERT INTO notification_prefs (userId, category, channel, enabled) VALUES (?, ?, ?, ?)",
      );
      for (const o of overrides) {
        insert.run(userId, o.category, o.channel, o.enabled ? 1 : 0);
      }
    })();
  }
}
