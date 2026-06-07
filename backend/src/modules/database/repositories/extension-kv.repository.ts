import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";

/** Per-extension key-value store backing ctx.storage. Values are JSON-encoded */
@Injectable()
export class ExtensionKvRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  get<T = unknown>(extId: string, key: string): T | null {
    const row = this.sqlite.connection
      .query("SELECT value FROM extension_kv WHERE extId = ? AND key = ?")
      .get(extId, key) as { value: string | null } | null;
    if (!row || row.value === null) return null;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  }

  set(extId: string, key: string, value: unknown): void {
    this.sqlite.connection
      .prepare(
        "INSERT OR REPLACE INTO extension_kv (extId, key, value) VALUES (?, ?, ?)",
      )
      .run(extId, key, JSON.stringify(value));
  }

  delete(extId: string, key: string): void {
    this.sqlite.connection
      .prepare("DELETE FROM extension_kv WHERE extId = ? AND key = ?")
      .run(extId, key);
  }

  keys(extId: string): string[] {
    const rows = this.sqlite.connection
      .query("SELECT key FROM extension_kv WHERE extId = ?")
      .all(extId) as { key: string }[];
    return rows.map((r) => String(r.key));
  }

  /** Drop all keys for an extension (on uninstall) */
  clear(extId: string): void {
    this.sqlite.connection
      .prepare("DELETE FROM extension_kv WHERE extId = ?")
      .run(extId);
  }
}
