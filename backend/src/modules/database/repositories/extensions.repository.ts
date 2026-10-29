import type {
  ExtensionRecord,
  ExtensionStatus,
} from "@/modules/extensions/extensions.types";
import type { Capability } from "@kubekpanel/extension-sdk";
import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";

/** Persistence for installed extensions (manifest + granted capabilities + enabled/status) */
@Injectable()
export class ExtensionsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): ExtensionRecord[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM extensions ORDER BY installedAt ASC")
      .all();
    return rows.map((row: any) => this.deserialize(row));
  }

  findById(id: string): ExtensionRecord | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM extensions WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  /** Saves the whole record on install or reinstall */
  upsert(
    record: Omit<ExtensionRecord, "version" | "installedAt" | "updatedAt"> & {
      installedAt?: number;
    },
  ): ExtensionRecord {
    const existing = this.findById(record.id);
    const installedAt =
      existing?.installedAt ?? record.installedAt ?? Date.now();
    // Not REPLACE: it deletes the row and the extension storage with it
    const stmt = this.sqlite.connection.prepare(`INSERT INTO extensions
      (id, enabled, manifest, grantedCapabilities, status, installedAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        enabled = excluded.enabled,
        manifest = excluded.manifest,
        grantedCapabilities = excluded.grantedCapabilities,
        status = excluded.status,
        installedAt = excluded.installedAt,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(
      record.id,
      record.enabled ? 1 : 0,
      JSON.stringify(record.manifest),
      JSON.stringify(record.grantedCapabilities ?? []),
      record.status,
      installedAt,
      Date.now(),
    );
    return this.findById(record.id)!;
  }

  setEnabled(id: string, enabled: boolean): void {
    this.sqlite.connection
      .prepare("UPDATE extensions SET enabled = ?, updatedAt = ? WHERE id = ?")
      .run(enabled ? 1 : 0, Date.now(), id);
  }

  setStatus(id: string, status: ExtensionStatus): void {
    this.sqlite.connection
      .prepare("UPDATE extensions SET status = ?, updatedAt = ? WHERE id = ?")
      .run(status, Date.now(), id);
  }

  setCapabilities(id: string, capabilities: Capability[]): void {
    this.sqlite.connection
      .prepare(
        "UPDATE extensions SET grantedCapabilities = ?, updatedAt = ? WHERE id = ?",
      )
      .run(JSON.stringify(capabilities), Date.now(), id);
  }

  delete(id: string): boolean {
    const result = this.sqlite.connection
      .prepare("DELETE FROM extensions WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  private deserialize(row: any): ExtensionRecord {
    const manifest = JSON.parse(String(row.manifest));
    return {
      id: String(row.id),
      version: String(manifest.version),
      enabled: Number(row.enabled) === 1,
      manifest,
      grantedCapabilities: JSON.parse(String(row.grantedCapabilities ?? "[]")),
      status: String(row.status) as ExtensionStatus,
      installedAt: Number(row.installedAt),
      updatedAt:
        row.updatedAt === null || row.updatedAt === undefined
          ? undefined
          : Number(row.updatedAt),
    };
  }
}
