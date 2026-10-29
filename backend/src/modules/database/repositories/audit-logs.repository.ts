import { Injectable } from "@nestjs/common";
import {
  type AuditCategory,
  type AuditChange,
  type AuditLogQuery,
  type AuditResult,
  type AuditSource,
  type IAuditLog,
} from "@shared/types/audit.types";
import { SqliteProvider } from "../sqlite.provider";

export interface PruneRule {
  /** Entries created before this moment go */
  before?: number | null;
  /** Only this many newest entries stay */
  keep?: number | null;
}

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  create(entry: IAuditLog): void {
    this.sqlite.connection
      .prepare(
        `INSERT INTO audit_logs
          (id, userId, username, action, category, resourceType, resourceId, resourceName,
           serverId, serverName, changes, details, result, error, ip, userAgent, source, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.userId,
        entry.username,
        entry.action,
        entry.category,
        entry.resourceType ?? null,
        entry.resourceId ?? null,
        entry.resourceName ?? null,
        entry.serverId ?? null,
        entry.serverName ?? null,
        entry.changes ? JSON.stringify(entry.changes) : null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.result,
        entry.error ?? null,
        entry.ip ?? null,
        entry.userAgent ?? null,
        entry.source,
        entry.createdAt,
      );
  }

  query(q: AuditLogQuery): { items: IAuditLog[]; total: number } {
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (q.category) {
      where.push("category = ?");
      params.push(q.category);
    }
    if (q.action) {
      where.push("action = ?");
      params.push(q.action);
    }
    if (q.userId) {
      where.push("userId = ?");
      params.push(q.userId);
    }
    if (q.serverId) {
      where.push("serverId = ?");
      params.push(q.serverId);
    }
    if (q.result) {
      where.push("result = ?");
      params.push(q.result);
    }
    if (q.from != null) {
      where.push("createdAt >= ?");
      params.push(q.from);
    }
    if (q.to != null) {
      where.push("createdAt <= ?");
      params.push(q.to);
    }
    if (q.search) {
      where.push(
        "(username LIKE ? OR resourceName LIKE ? OR serverName LIKE ? OR action LIKE ?)",
      );
      const like = `%${q.search}%`;
      params.push(like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRow = this.sqlite.connection
      .query(`SELECT COUNT(*) AS total FROM audit_logs ${whereSql}`)
      .get(...params) as { total: number };

    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;

    const rows = this.sqlite.connection
      .query(
        `SELECT * FROM audit_logs ${whereSql} ORDER BY createdAt DESC, rowid DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    return {
      items: rows.map((r) => this.deserialize(r)),
      total: Number(countRow?.total ?? 0),
    };
  }

  /** Entries a retention would remove: older than before or past the newest keep */
  countPrunable(rule: PruneRule): number {
    const where = this.pruneWhere(rule);
    if (!where) return 0;
    const row = this.sqlite.connection
      .query(`SELECT COUNT(*) AS total FROM audit_logs WHERE ${where.sql}`)
      .get(...where.params) as { total: number };
    return Number(row?.total ?? 0);
  }

  prune(rule: PruneRule): number {
    const where = this.pruneWhere(rule);
    if (!where) return 0;
    return this.sqlite.connection
      .prepare(`DELETE FROM audit_logs WHERE ${where.sql}`)
      .run(...where.params).changes;
  }

  stats(): { total: number; oldestAt: number | null } {
    const row = this.sqlite.connection
      .query(
        "SELECT COUNT(*) AS total, MIN(createdAt) AS oldest FROM audit_logs",
      )
      .get() as { total: number; oldest: number | null };
    return {
      total: Number(row?.total ?? 0),
      oldestAt: row?.oldest == null ? null : Number(row.oldest),
    };
  }

  private pruneWhere(rule: PruneRule) {
    const parts: string[] = [];
    const params: number[] = [];
    if (rule.before != null) {
      parts.push("createdAt < ?");
      params.push(rule.before);
    }
    if (rule.keep != null) {
      parts.push(
        "id NOT IN (SELECT id FROM audit_logs ORDER BY createdAt DESC, rowid DESC LIMIT ?)",
      );
      params.push(rule.keep);
    }
    return parts.length ? { sql: parts.join(" OR "), params } : null;
  }

  private deserialize(row: any): IAuditLog {
    return {
      id: String(row.id),
      userId: row.userId == null ? null : String(row.userId),
      username: String(row.username),
      action: String(row.action),
      category: row.category as AuditCategory,
      resourceType: row.resourceType ?? null,
      resourceId: row.resourceId ?? null,
      resourceName: row.resourceName ?? null,
      serverId: row.serverId ?? null,
      serverName: row.serverName ?? null,
      changes: row.changes ? this.safeParse<AuditChange[]>(row.changes) : null,
      details: row.details ? this.safeParse(row.details) : null,
      result: row.result as AuditResult,
      error: row.error ?? null,
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
      source: row.source as AuditSource,
      createdAt: Number(row.createdAt),
    };
  }

  private safeParse<T = Record<string, unknown>>(value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
}
