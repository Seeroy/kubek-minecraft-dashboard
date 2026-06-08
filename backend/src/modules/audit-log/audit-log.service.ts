import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { Injectable } from "@nestjs/common";
import {
  type AuditLogQuery,
  type AuditRecordInput,
  AuditResult,
} from "@shared/types/audit.types";
import { randomUUID } from "crypto";

@Injectable()
export class AuditLogService {
  constructor(private readonly repo: AuditLogsRepository) {}

  record(input: AuditRecordInput): void {
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

  query(q: AuditLogQuery) {
    return this.repo.query(q);
  }
}
