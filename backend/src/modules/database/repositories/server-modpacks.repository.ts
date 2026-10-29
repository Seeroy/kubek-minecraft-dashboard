import { Injectable } from "@nestjs/common";
import type {
  ModpackSource,
  ServerModpackRecord,
} from "@shared/types/modpack.types";
import { SqliteProvider } from "../sqlite.provider";

export abstract class IServerModpacksRepository {
  abstract findByServer(serverId: string): ServerModpackRecord | null;

  abstract save(record: ServerModpackRecord): ServerModpackRecord;
}

@Injectable()
export class ServerModpacksRepository implements IServerModpacksRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findByServer(serverId: string): ServerModpackRecord | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM server_modpacks WHERE serverId = ?")
      .get(serverId);
    return row ? this.deserialize(row) : null;
  }

  save(record: ServerModpackRecord): ServerModpackRecord {
    this.sqlite.connection
      .prepare(
        `INSERT OR REPLACE INTO server_modpacks
          (serverId, source, projectId, versionId, name, version, installedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.serverId,
        record.source,
        record.projectId ?? null,
        record.versionId ?? null,
        record.name,
        record.version,
        record.installedAt,
      );
    return this.findByServer(record.serverId)!;
  }

  private deserialize(row: any): ServerModpackRecord {
    return {
      serverId: String(row.serverId),
      source: String(row.source) as ModpackSource,
      projectId: row.projectId ? String(row.projectId) : undefined,
      versionId: row.versionId ? String(row.versionId) : undefined,
      name: String(row.name),
      version: String(row.version),
      installedAt: Number(row.installedAt),
    };
  }
}
