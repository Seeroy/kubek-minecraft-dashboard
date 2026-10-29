import type { Database } from "bun:sqlite";
import { columnsOf } from "./migration.types";

// Inbox and per-category channel preferences. The old task-results toggle
// becomes the Telegram preference of the tasks category
export function notifications(db: Database): void {
  db.run(`CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    params TEXT NOT NULL DEFAULT '{}',
    readAt INTEGER,
    createdAt INTEGER NOT NULL
  )`);
  db.run(
    "CREATE INDEX idx_notifications_user_created ON notifications (userId, createdAt DESC, id DESC)",
  );
  db.run(
    "CREATE INDEX idx_notifications_user_unread ON notifications (userId) WHERE readAt IS NULL",
  );

  db.run(`CREATE TABLE notification_prefs (
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    channel TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    PRIMARY KEY (userId, category, channel)
  )`);

  if (columnsOf(db, "users").includes("notifyTaskResults")) {
    db.run(`INSERT INTO notification_prefs (userId, category, channel, enabled)
      SELECT id, 'tasks', 'telegram', 1 FROM users WHERE notifyTaskResults = 1`);
    db.run("ALTER TABLE users DROP COLUMN notifyTaskResults");
  }
}
