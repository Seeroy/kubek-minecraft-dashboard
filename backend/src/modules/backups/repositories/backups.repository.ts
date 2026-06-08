import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../../database/sqlite.provider";
import { BackupEntity, BackupStatus } from "../dto/backup.entity";
import { BackupType } from "../dto/create-backup.dto";

export abstract class IBackupsRepository {
  abstract findAll(): BackupEntity[];

  abstract findById(id: string): BackupEntity | null;

  abstract findByServerId(serverId: string): BackupEntity[];

  abstract create(backup: BackupEntity): void;

  abstract update(backup: BackupEntity): void;

  abstract delete(id: string): void;
}

@Injectable()
export class BackupsRepository implements IBackupsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): BackupEntity[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM backups ORDER BY createdAt DESC")
      .all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findById(id: string): BackupEntity | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM backups WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByServerId(serverId: string): BackupEntity[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM backups WHERE serverId = ? ORDER BY createdAt DESC")
      .all(serverId);
    return rows.map((r: any) => this.deserialize(r));
  }

  create(backup: BackupEntity): void {
    const stmt = this.sqlite.connection.prepare(`INSERT INTO backups
      (id, name, description, type, status, progress, createdAt, updatedAt, fileCount, totalSize, selectedFiles, serverId, path, ownerId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      backup.id,
      backup.name,
      backup.description || null,
      backup.type,
      backup.status,
      backup.progress,
      backup.createdAt,
      backup.updatedAt,
      backup.fileCount,
      backup.totalSize,
      backup.selectedFiles ? JSON.stringify(backup.selectedFiles) : null,
      backup.serverId,
      backup.path || null,
      backup.ownerId || null,
    );
  }

  update(backup: BackupEntity): void {
    const stmt = this.sqlite.connection.prepare(`UPDATE backups SET
      name = ?, description = ?, type = ?, status = ?, progress = ?, updatedAt = ?,
      fileCount = ?, totalSize = ?, selectedFiles = ?, serverId = ?, path = ?, ownerId = ?
      WHERE id = ?`);
    stmt.run(
      backup.name,
      backup.description || null,
      backup.type,
      backup.status,
      backup.progress,
      backup.updatedAt,
      backup.fileCount,
      backup.totalSize,
      backup.selectedFiles ? JSON.stringify(backup.selectedFiles) : null,
      backup.serverId,
      backup.path || null,
      backup.ownerId || null,
      backup.id,
    );
  }

  delete(id: string): void {
    this.sqlite.connection.prepare("DELETE FROM backups WHERE id = ?").run(id);
  }

  private deserialize(row: any): BackupEntity {
    return {
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : undefined,
      type: row.type as BackupType,
      status: row.status as BackupStatus,
      progress: Number(row.progress),
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
      fileCount: Number(row.fileCount),
      totalSize: Number(row.totalSize),
      selectedFiles: row.selectedFiles
        ? JSON.parse(row.selectedFiles)
        : undefined,
      serverId: String(row.serverId),
      path: row.path ? String(row.path) : undefined,
      ownerId: row.ownerId ? String(row.ownerId) : undefined,
    };
  }
}
