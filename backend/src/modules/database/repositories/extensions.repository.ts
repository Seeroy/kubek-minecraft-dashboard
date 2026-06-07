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

  /** Insert or replace the full record (install/reinstall) */
  upsert(
    record: Omit<ExtensionRecord, "installedAt" | "updatedAt"> & {
      installedAt?: number;
    },
  ): ExtensionRecord {
    const existing = this.findById(record.id);
    const installedAt =
      existing?.installedAt ?? record.installedAt ?? Date.now();
    const stmt = this.sqlite.connection
      .prepare(`INSERT OR REPLACE INTO extensions
      (id, version, enabled, manifest, grantedCapabilities, status, installedAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.version,
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
    return {
      id: String(row.id),
      version: String(row.version),
      enabled: Number(row.enabled) === 1,
      manifest: JSON.parse(String(row.manifest)),
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
