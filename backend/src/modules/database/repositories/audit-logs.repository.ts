import { Injectable } from "@nestjs/common";
import {
  type AuditCategory,
  type AuditLogQuery,
  type AuditResult,
  type AuditSource,
  type IAuditLog,
} from "@shared/types/audit.types";
import { SqliteProvider } from "../sqlite.provider";

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  create(entry: IAuditLog): void {
    this.sqlite.connection
      .prepare(
        `INSERT INTO audit_logs
          (id, userId, username, action, category, resourceType, resourceId, resourceName, details, result, error, ip, userAgent, source, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      where.push("(username LIKE ? OR resourceName LIKE ? OR action LIKE ?)");
      const like = `%${q.search}%`;
      params.push(like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRow = this.sqlite.connection
      .query(`SELECT COUNT(*) AS total FROM audit_logs ${whereSql}`)
      .get(...params) as { total: number };

    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;

    const rows = this.sqlite.connection
      .query(
        `SELECT * FROM audit_logs ${whereSql} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    return {
      items: rows.map((r) => this.deserialize(r)),
      total: Number(countRow?.total ?? 0),
    };
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
      details: row.details ? this.safeParse(row.details) : null,
      result: row.result as AuditResult,
      error: row.error ?? null,
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
      source: row.source as AuditSource,
      createdAt: Number(row.createdAt),
    };
  }

  private safeParse(value: string): Record<string, unknown> | null {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
