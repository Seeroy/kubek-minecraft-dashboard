import { Injectable } from "@nestjs/common";
import type {
  CreateServerFolderProps,
  IServerFolder,
  UpdateServerFolderProps,
} from "@shared/types/server/folder.types";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../sqlite.provider";

export abstract class IServerFoldersRepository {
  abstract findAll(): IServerFolder[];

  abstract findById(id: string): IServerFolder | null;

  abstract create(folder: CreateServerFolderProps): IServerFolder;

  abstract update(
    id: string,
    updates: UpdateServerFolderProps,
  ): IServerFolder | null;

  abstract delete(id: string): boolean;

  abstract moveServers(serverIds: string[], folderId: string | null): number;
}

@Injectable()
export class ServerFoldersRepository implements IServerFoldersRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): IServerFolder[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM server_folders ORDER BY sortOrder ASC, name ASC")
      .all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findById(id: string): IServerFolder | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM server_folders WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  create(folder: CreateServerFolderProps): IServerFolder {
    const id = randomUUID();
    const stmt = this.sqlite.connection.prepare(
      `INSERT INTO server_folders (id, name, color, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?)`,
    );
    stmt.run(
      id,
      folder.name,
      folder.color ?? null,
      folder.sortOrder ?? 0,
      Date.now(),
    );
    return this.findById(id)!;
  }

  update(id: string, updates: UpdateServerFolderProps): IServerFolder | null {
    const existing = this.findById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates };
    this.sqlite.connection
      .prepare(
        `UPDATE server_folders SET name = ?, color = ?, sortOrder = ? WHERE id = ?`,
      )
      .run(merged.name, merged.color ?? null, merged.sortOrder ?? 0, id);
    return this.findById(id);
  }

  delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) return false;
    this.sqlite.connection
      .prepare(`DELETE FROM server_folders WHERE id = ?`)
      .run(id);
    return true;
  }

  // Bulk move in a single transaction. folderId=null moves to "no folder"
  moveServers(serverIds: string[], folderId: string | null): number {
    if (serverIds.length === 0) return 0;
    const stmt = this.sqlite.connection.prepare(
      `UPDATE servers SET folderId = ? WHERE id = ?`,
    );
    let affected = 0;
    const tx = this.sqlite.connection.transaction((ids: string[]) => {
      for (const sid of ids) {
        const res = stmt.run(folderId, sid);
        affected += res.changes ?? 0;
      }
    });
    tx(serverIds);
    return affected;
  }

  private deserialize(row: any): IServerFolder {
    return {
      id: String(row.id),
      name: String(row.name),
      color: row.color != null ? String(row.color) : null,
      sortOrder: Number(row.sortOrder ?? 0),
      createdAt: Number(row.createdAt),
    };
  }
}
