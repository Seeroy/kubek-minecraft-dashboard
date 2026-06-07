import { Injectable } from "@nestjs/common";
import { ServerPluginRecord } from "@shared/types/plugins/server-plugin.types";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../sqlite.provider";

export abstract class IServerPluginsRepository {
  abstract findByServer(serverId: string): ServerPluginRecord[];

  abstract findById(id: string): ServerPluginRecord | null;

  abstract findByServerAndProject(
    serverId: string,
    projectId: string,
  ): ServerPluginRecord | null;

  abstract create(
    record: Omit<ServerPluginRecord, "id" | "installedAt" | "updatedAt"> & {
      id?: string;
      installedAt?: number;
      updatedAt?: number | null;
    },
  ): ServerPluginRecord;

  abstract update(
    id: string,
    updates: Partial<
      Omit<ServerPluginRecord, "id" | "serverId" | "installedAt">
    >,
  ): ServerPluginRecord | null;

  abstract delete(id: string): boolean;

  abstract listDependants(parentId: string): ServerPluginRecord[];
}

@Injectable()
export class ServerPluginsRepository implements IServerPluginsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findByServer(serverId: string): ServerPluginRecord[] {
    const rows = this.sqlite.connection
      .query(
        "SELECT * FROM server_plugins WHERE serverId = ? ORDER BY installedAt DESC",
      )
      .all(serverId);
    return rows.map((row: any) => this.deserialize(row));
  }

  findById(id: string): ServerPluginRecord | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM server_plugins WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByServerAndProject(
    serverId: string,
    projectId: string,
  ): ServerPluginRecord | null {
    const row = this.sqlite.connection
      .query(
        "SELECT * FROM server_plugins WHERE serverId = ? AND projectId = ?",
      )
      .get(serverId, projectId);
    return row ? this.deserialize(row) : null;
  }

  create(
    record: Omit<ServerPluginRecord, "id" | "installedAt" | "updatedAt"> & {
      id?: string;
      installedAt?: number;
      updatedAt?: number | null;
    },
  ): ServerPluginRecord {
    const id = record.id ?? randomUUID();
    const installedAt = record.installedAt ?? Date.now();
    const stmt = this.sqlite.connection.prepare(`INSERT INTO server_plugins
      (id, serverId, projectId, versionId, fileName, fileHash, dependencyOf, installedAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      record.serverId,
      record.projectId,
      record.versionId,
      record.fileName,
      record.fileHash ?? null,
      record.dependencyOf ?? null,
      installedAt,
      record.updatedAt ?? null,
    );
    return this.findById(id)!;
  }

  update(
    id: string,
    updates: Partial<
      Omit<ServerPluginRecord, "id" | "serverId" | "installedAt">
    >,
  ): ServerPluginRecord | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const next = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    const stmt = this.sqlite.connection.prepare(`UPDATE server_plugins SET
      projectId = ?,
      versionId = ?,
      fileName = ?,
      fileHash = ?,
      dependencyOf = ?,
      updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      next.projectId,
      next.versionId,
      next.fileName,
      next.fileHash ?? null,
      next.dependencyOf ?? null,
      next.updatedAt ?? null,
      id,
    );

    return this.findById(id);
  }

  delete(id: string): boolean {
    const stmt = this.sqlite.connection.prepare(
      "DELETE FROM server_plugins WHERE id = ?",
    );
    const result = stmt.run(id);
    return result.changes > 0;
  }

  listDependants(parentId: string): ServerPluginRecord[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM server_plugins WHERE dependencyOf = ?")
      .all(parentId);
    return rows.map((row: any) => this.deserialize(row));
  }

  private deserialize(row: any): ServerPluginRecord {
    return {
      id: String(row.id),
      serverId: String(row.serverId),
      projectId: String(row.projectId),
      versionId: String(row.versionId),
      fileName: String(row.fileName),
      fileHash: row.fileHash ? String(row.fileHash) : undefined,
      dependencyOf: row.dependencyOf ? String(row.dependencyOf) : undefined,
      installedAt: Number(row.installedAt),
      updatedAt:
        row.updatedAt === null || row.updatedAt === undefined
          ? undefined
          : Number(row.updatedAt),
    };
  }
}
