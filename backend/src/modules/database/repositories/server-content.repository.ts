import { ServerPluginRecord } from "@shared/types/plugins/server-plugin.types";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../sqlite.provider";

export type ServerContentKind = "plugin" | "mod";

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

// Plugins and mods live in one table, each subclass works with its own kind
export abstract class ServerContentRepository implements IServerPluginsRepository {
  protected constructor(
    private readonly sqlite: SqliteProvider,
    private readonly kind: ServerContentKind,
  ) {}

  findByServer(serverId: string): ServerPluginRecord[] {
    const rows = this.sqlite.connection
      .query(
        "SELECT * FROM server_content WHERE kind = ? AND serverId = ? ORDER BY installedAt DESC",
      )
      .all(this.kind, serverId);
    return rows.map((row: any) => this.deserialize(row));
  }

  findById(id: string): ServerPluginRecord | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM server_content WHERE kind = ? AND id = ?")
      .get(this.kind, id);
    return row ? this.deserialize(row) : null;
  }

  findByServerAndProject(
    serverId: string,
    projectId: string,
  ): ServerPluginRecord | null {
    const row = this.sqlite.connection
      .query(
        "SELECT * FROM server_content WHERE kind = ? AND serverId = ? AND projectId = ?",
      )
      .get(this.kind, serverId, projectId);
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
    const stmt = this.sqlite.connection.prepare(`INSERT INTO server_content
      (id, serverId, kind, projectId, versionId, fileName, fileHash, dependencyOf, installedAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      record.serverId,
      this.kind,
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

    const stmt = this.sqlite.connection.prepare(`UPDATE server_content SET
      projectId = ?,
      versionId = ?,
      fileName = ?,
      fileHash = ?,
      dependencyOf = ?,
      updatedAt = ?
      WHERE kind = ? AND id = ?
    `);
    stmt.run(
      next.projectId,
      next.versionId,
      next.fileName,
      next.fileHash ?? null,
      next.dependencyOf ?? null,
      next.updatedAt ?? null,
      this.kind,
      id,
    );

    return this.findById(id);
  }

  delete(id: string): boolean {
    const stmt = this.sqlite.connection.prepare(
      "DELETE FROM server_content WHERE kind = ? AND id = ?",
    );
    const result = stmt.run(this.kind, id);
    return result.changes > 0;
  }

  listDependants(parentId: string): ServerPluginRecord[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM server_content WHERE kind = ? AND dependencyOf = ?")
      .all(this.kind, parentId);
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
