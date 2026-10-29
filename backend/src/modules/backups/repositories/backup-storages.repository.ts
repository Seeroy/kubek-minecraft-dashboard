import { Injectable } from "@nestjs/common";
import type {
  BackupStorageDriverKind,
  S3StorageConfig,
} from "@shared/types/backup.types";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../../database/sqlite.provider";

/** Storage row with the full driver config, secrets included */
export interface StoredStorage {
  id: string;
  name: string;
  driver: BackupStorageDriverKind;
  config: S3StorageConfig;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class BackupStoragesRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): StoredStorage[] {
    return this.query("ORDER BY createdAt");
  }

  findById(id: string): StoredStorage | null {
    return this.query("WHERE id = ?", id)[0] ?? null;
  }

  create(
    input: Pick<StoredStorage, "name" | "driver" | "config">,
  ): StoredStorage {
    const now = Date.now();
    const storage: StoredStorage = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.sqlite.connection
      .prepare(
        "INSERT INTO backup_storages (id, name, driver, config, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        storage.id,
        storage.name,
        storage.driver,
        JSON.stringify(storage.config),
        now,
        now,
      );
    return storage;
  }

  update(id: string, patch: Pick<StoredStorage, "name" | "config">): void {
    this.sqlite.connection
      .prepare(
        "UPDATE backup_storages SET name = ?, config = ?, updatedAt = ? WHERE id = ?",
      )
      .run(patch.name, JSON.stringify(patch.config), Date.now(), id);
  }

  delete(id: string): void {
    this.sqlite.connection
      .prepare("DELETE FROM backup_storages WHERE id = ?")
      .run(id);
  }

  private query(clause: string, ...params: string[]): StoredStorage[] {
    return this.sqlite.connection
      .query(`SELECT * FROM backup_storages ${clause}`)
      .all(...params)
      .map((row: any) => ({
        id: String(row.id),
        name: String(row.name),
        driver: row.driver as BackupStorageDriverKind,
        config: JSON.parse(String(row.config)) as S3StorageConfig,
        createdAt: Number(row.createdAt),
        updatedAt: Number(row.updatedAt),
      }));
  }
}
