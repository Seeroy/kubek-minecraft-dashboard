import { Injectable } from "@nestjs/common";
import {
  type Backup,
  type BackupFile,
  BackupFormat,
  BackupStatus,
  BackupType,
  SelectionMode,
} from "@shared/types/backup.types";
import { basename } from "path";
import { SqliteProvider } from "../../database/sqlite.provider";

/** Backup row without its copies */
export type BackupRecord = Omit<Backup, "copies">;

type RuleKind = "include" | "exclude";

const COLUMNS = `name, description, type, status, createdAt, updatedAt,
  fileCount, totalSize, serverId, ownerId, format, compressionRatio, pinned, checksum`;

@Injectable()
export class BackupsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): BackupRecord[] {
    return this.query("ORDER BY createdAt DESC");
  }

  findById(id: string): BackupRecord | null {
    return this.query("WHERE id = ?", id)[0] ?? null;
  }

  findByServerId(serverId: string): BackupRecord[] {
    return this.query("WHERE serverId = ? ORDER BY createdAt DESC", serverId);
  }

  findByStatus(status: BackupStatus): BackupRecord[] {
    return this.query("WHERE status = ?", status);
  }

  create(backup: BackupRecord): void {
    const db = this.sqlite.connection;
    db.transaction(() => {
      db.prepare(
        `INSERT INTO backups (id, ${COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(backup.id, ...this.values(backup));
      this.writeRules(backup);
    })();
  }

  /**
   * Rules are fixed when the backup is created and the pin has its own
   * setter, so a running task never overwrites a pin set meanwhile
   */
  update(backup: BackupRecord): void {
    const columns = COLUMNS.split(",").map((c) => c.trim());
    const assignments = columns
      .filter((c) => c !== "pinned")
      .map((c) => `${c} = ?`)
      .join(", ");
    const values = this.values(backup).filter(
      (_, i) => columns[i] !== "pinned",
    );
    this.sqlite.connection
      .prepare(`UPDATE backups SET ${assignments} WHERE id = ?`)
      .run(...values, backup.id);
  }

  setPinned(id: string, pinned: boolean): void {
    this.sqlite.connection
      .prepare("UPDATE backups SET pinned = ?, updatedAt = ? WHERE id = ?")
      .run(pinned ? 1 : 0, Date.now(), id);
  }

  delete(id: string): void {
    this.sqlite.connection.prepare("DELETE FROM backups WHERE id = ?").run(id);
  }

  private writeRules(backup: BackupRecord): void {
    const insert = this.sqlite.connection.prepare(
      "INSERT INTO backup_file_rules (backupId, kind, position, path) VALUES (?, ?, ?, ?)",
    );
    (backup.selectedFiles ?? []).forEach((file, i) =>
      insert.run(backup.id, "include", i, file.path),
    );
    (backup.globExceptions ?? []).forEach((pattern, i) =>
      insert.run(backup.id, "exclude", i, pattern),
    );
  }

  private query(clause: string, ...params: string[]): BackupRecord[] {
    const rows = this.sqlite.connection
      .query(`SELECT * FROM backups ${clause}`)
      .all(...params);
    const rules = this.rulesOf(rows.map((row: any) => String(row.id)));
    return rows.map((row) => this.deserialize(row, rules));
  }

  private rulesOf(ids: string[]): Map<string, Record<RuleKind, string[]>> {
    const byBackup = new Map<string, Record<RuleKind, string[]>>();
    if (ids.length === 0) return byBackup;
    const rows = this.sqlite.connection
      .query(
        `SELECT backupId, kind, path FROM backup_file_rules
        WHERE backupId IN (${ids.map(() => "?").join(", ")})
        ORDER BY backupId, kind, position`,
      )
      .all(...ids) as { backupId: string; kind: RuleKind; path: string }[];
    for (const row of rows) {
      const entry = byBackup.get(row.backupId) ?? { include: [], exclude: [] };
      entry[row.kind].push(row.path);
      byBackup.set(row.backupId, entry);
    }
    return byBackup;
  }

  private values(b: BackupRecord) {
    return [
      b.name,
      b.description ?? null,
      b.type,
      b.status,
      b.createdAt,
      b.updatedAt,
      b.fileCount,
      b.totalSize,
      b.serverId,
      b.ownerId ?? null,
      b.format,
      b.compressionRatio ?? null,
      b.pinned ? 1 : 0,
      b.checksum ?? null,
    ];
  }

  private deserialize(
    row: any,
    rules: Map<string, Record<RuleKind, string[]>>,
  ): BackupRecord {
    const id = String(row.id);
    const type = row.type as BackupType;
    const { include, exclude } = rules.get(id) ?? { include: [], exclude: [] };
    return {
      id,
      name: String(row.name),
      description: row.description ? String(row.description) : undefined,
      type,
      status: row.status as BackupStatus,
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
      fileCount: Number(row.fileCount),
      totalSize: Number(row.totalSize),
      selectedFiles: include.length ? include.map(toBackupFile) : undefined,
      serverId: String(row.serverId),
      ownerId: row.ownerId ? String(row.ownerId) : undefined,
      format: (row.format as BackupFormat) ?? BackupFormat.ZIP,
      compressionRatio: row.compressionRatio ?? undefined,
      selectionMode:
        type === BackupType.PARTIAL ? SelectionMode.CUSTOM : SelectionMode.ALL,
      globExceptions: exclude.length ? exclude : undefined,
      pinned: !!row.pinned,
      checksum: row.checksum ? String(row.checksum) : undefined,
    };
  }
}

const toBackupFile = (path: string): BackupFile => ({
  name: basename(path),
  path,
});
