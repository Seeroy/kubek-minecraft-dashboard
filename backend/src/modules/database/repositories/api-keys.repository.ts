import { Injectable } from "@nestjs/common";
import type { AccessMap } from "@shared/access/areas";
import type { IApiKey } from "@shared/types/api-key.types";
import { SqliteProvider } from "../sqlite.provider";

type KeyChanges = Partial<Pick<IApiKey, "name" | "grants" | "servers" | "mcp">>;

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findById(id: string): IApiKey | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM api_keys WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByTokenHash(tokenHash: string): IApiKey | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM api_keys WHERE tokenHash = ?")
      .get(tokenHash);
    return row ? this.deserialize(row) : null;
  }

  findByUserId(userId: string): IApiKey[] {
    return this.sqlite.connection
      .query("SELECT * FROM api_keys WHERE userId = ? ORDER BY createdAt DESC")
      .all(userId)
      .map((row) => this.deserialize(row));
  }

  findAll(): IApiKey[] {
    return this.sqlite.connection
      .query("SELECT * FROM api_keys ORDER BY createdAt DESC")
      .all()
      .map((row) => this.deserialize(row));
  }

  create(key: IApiKey): void {
    this.sqlite.connection
      .prepare(
        `INSERT INTO api_keys
          (id, userId, name, prefix, tokenHash, grants, servers, mcp, createdAt, expiresAt, lastUsedAt, lastUsedIp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        key.id,
        key.userId,
        key.name,
        key.prefix,
        key.tokenHash,
        JSON.stringify(key.grants),
        key.servers ? JSON.stringify(key.servers) : null,
        key.mcp ? 1 : 0,
        key.createdAt,
        key.expiresAt,
        key.lastUsedAt,
        key.lastUsedIp,
      );
  }

  update(id: string, changes: KeyChanges): void {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (changes.name !== undefined) {
      sets.push("name = ?");
      params.push(changes.name);
    }
    if (changes.grants !== undefined) {
      sets.push("grants = ?");
      params.push(JSON.stringify(changes.grants));
    }
    if (changes.servers !== undefined) {
      sets.push("servers = ?");
      params.push(changes.servers ? JSON.stringify(changes.servers) : null);
    }
    if (changes.mcp !== undefined) {
      sets.push("mcp = ?");
      params.push(changes.mcp ? 1 : 0);
    }
    if (!sets.length) return;
    this.sqlite.connection
      .prepare(`UPDATE api_keys SET ${sets.join(", ")} WHERE id = ?`)
      .run(...params, id);
  }

  touch(id: string, at: number, ip: string | null): void {
    this.sqlite.connection
      .prepare(
        "UPDATE api_keys SET lastUsedAt = ?, lastUsedIp = ? WHERE id = ?",
      )
      .run(at, ip, id);
  }

  delete(id: string): boolean {
    return (
      this.sqlite.connection
        .prepare("DELETE FROM api_keys WHERE id = ?")
        .run(id).changes > 0
    );
  }

  deleteExpired(now: number): number {
    return this.sqlite.connection
      .prepare(
        "DELETE FROM api_keys WHERE expiresAt IS NOT NULL AND expiresAt <= ?",
      )
      .run(now).changes;
  }

  private deserialize(row: any): IApiKey {
    return {
      id: String(row.id),
      userId: String(row.userId),
      name: String(row.name),
      prefix: String(row.prefix),
      tokenHash: String(row.tokenHash),
      grants: parseJson<AccessMap>(row.grants) ?? {},
      servers: parseJson<string[]>(row.servers),
      mcp: !!row.mcp,
      createdAt: Number(row.createdAt),
      expiresAt: row.expiresAt == null ? null : Number(row.expiresAt),
      lastUsedAt: row.lastUsedAt == null ? null : Number(row.lastUsedAt),
      lastUsedIp: row.lastUsedIp ?? null,
    };
  }
}

function parseJson<T>(value: unknown): T | null {
  if (typeof value !== "string" || !value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
