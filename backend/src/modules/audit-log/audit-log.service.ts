import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { Injectable } from "@nestjs/common";
import {
  type AuditLogQuery,
  type AuditRecordInput,
  AuditResult,
} from "@shared/types/audit.types";
import { randomUUID } from "crypto";

@Injectable()
export class AuditLogService {
  constructor(
    private readonly repo: AuditLogsRepository,
    private readonly servers: ServersRepository,
  ) {}

  record(entry: AuditRecordInput): void {
    // A server resource is its own server, callers need not repeat it
    const input =
      entry.serverId || entry.resourceType !== "server"
        ? entry
        : {
            ...entry,
            serverId: entry.resourceId,
            serverName: entry.serverName ?? entry.resourceName,
          };
    try {
      this.repo.create({
        id: randomUUID(),
        createdAt: Date.now(),
        userId: input.userId ?? null,
        username: input.username || "unknown",
        action: input.action,
        category: input.category,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        resourceName: input.resourceName ?? null,
        serverId: input.serverId ?? null,
        serverName: input.serverId ? this.serverName(input) : null,
        changes: input.changes?.length ? input.changes : null,
        details: input.details ?? null,
        result: input.result ?? AuditResult.SUCCESS,
        error: input.error ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        source: input.source ?? "panel",
      });
    } catch (e) {
      console.error("[AuditLog] Failed to record entry:", e);
    }
  }

  // The name is kept with the entry so it outlives a rename or deletion
  private serverName(input: AuditRecordInput): string | null {
    if (input.serverName) return input.serverName;
    return this.servers.findById(input.serverId!)?.name ?? null;
  }

  query(q: AuditLogQuery) {
    return this.repo.query(q);
  }
}
