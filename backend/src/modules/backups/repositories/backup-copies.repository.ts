import { Injectable } from "@nestjs/common";
import { type BackupCopy, BackupCopyStatus } from "@shared/types/backup.types";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../../database/sqlite.provider";

/** Copy row with the location of the archive, which never leaves the backend */
export interface StoredCopy extends BackupCopy {
  objectKey: string;
}

@Injectable()
export class BackupCopiesRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findByBackup(backupId: string): StoredCopy[] {
    return this.query("WHERE backupId = ? ORDER BY createdAt", backupId);
  }

  findByBackups(backupIds: string[]): StoredCopy[] {
    if (backupIds.length === 0) return [];
    const marks = backupIds.map(() => "?").join(", ");
    return this.query(`WHERE backupId IN (${marks})`, ...backupIds);
  }

  findById(id: string): StoredCopy | null {
    return this.query("WHERE id = ?", id)[0] ?? null;
  }

  /** The copy of a backup at one location, null storage is the panel disk */
  findAt(backupId: string, storageId: string | null): StoredCopy | null {
    return storageId
      ? (this.query(
          "WHERE backupId = ? AND storageId = ?",
          backupId,
          storageId,
        )[0] ?? null)
      : (this.query("WHERE backupId = ? AND storageId IS NULL", backupId)[0] ??
          null);
  }

  countForStorage(storageId: string): number {
    const row = this.sqlite.connection
      .query("SELECT COUNT(*) AS c FROM backup_copies WHERE storageId = ?")
      .get(storageId) as { c: number };
    return Number(row.c);
  }

  /** Keys of every archive the panel disk is supposed to hold */
  localKeys(): string[] {
    return this.sqlite.connection
      .query("SELECT objectKey FROM backup_copies WHERE storageId IS NULL")
      .all()
      .map((row: any) => String(row.objectKey));
  }

  findByStatus(status: BackupCopyStatus): StoredCopy[] {
    return this.query("WHERE status = ?", status);
  }

  create(
    input: Omit<StoredCopy, "id" | "createdAt" | "updatedAt">,
  ): StoredCopy {
    const now = Date.now();
    const copy: StoredCopy = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.sqlite.connection
      .prepare(
        `INSERT INTO backup_copies
        (id, backupId, storageId, objectKey, size, status, error, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        copy.id,
        copy.backupId,
        copy.storageId,
        copy.objectKey,
        copy.size,
        copy.status,
        copy.error,
        copy.createdAt,
        copy.updatedAt,
      );
    return copy;
  }

  setStatus(
    id: string,
    status: BackupCopyStatus,
    patch: { size?: number; error?: string | null } = {},
  ): void {
    this.sqlite.connection
      .prepare(
        `UPDATE backup_copies SET status = ?, size = COALESCE(?, size), error = ?, updatedAt = ?
        WHERE id = ?`,
      )
      .run(status, patch.size ?? null, patch.error ?? null, Date.now(), id);
  }

  delete(id: string): void {
    this.sqlite.connection
      .prepare("DELETE FROM backup_copies WHERE id = ?")
      .run(id);
  }

  private query(clause: string, ...params: string[]): StoredCopy[] {
    return this.sqlite.connection
      .query(`SELECT * FROM backup_copies ${clause}`)
      .all(...params)
      .map((row: any) => ({
        id: String(row.id),
        backupId: String(row.backupId),
        storageId: row.storageId ? String(row.storageId) : null,
        objectKey: String(row.objectKey),
        size: Number(row.size),
        status: row.status as BackupCopyStatus,
        error: row.error ? String(row.error) : null,
        createdAt: Number(row.createdAt),
        updatedAt: Number(row.updatedAt),
      }));
  }
}
