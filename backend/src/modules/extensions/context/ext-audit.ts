import { extractClientIp } from "@/core/utils/request";
import type { AuditLogService } from "@/modules/audit-log/audit-log.service";
import {
  type AuditActionValue,
  AuditCategory,
  AuditResult,
} from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import { AsyncLocalStorage } from "node:async_hooks";

/** Who clicked, set by the route dispatcher for the duration of a handler */
export interface ExtActor {
  userId: string;
  username: string;
  ip: string | null;
  userAgent: string | null;
  apiKeyId?: string | null;
  apiKeyName?: string | null;
}

export const extActor = new AsyncLocalStorage<ExtActor>();

export function actorOf(user: IUser, req: Request): ExtActor {
  return {
    userId: user.id,
    username: user.username,
    ip: extractClientIp(req),
    userAgent: req.headers["user-agent"] ?? null,
    apiKeyId: user.apiKey?.id ?? null,
    apiKeyName: user.apiKey?.name ?? null,
  };
}

export interface ExtAuditEntry {
  action: AuditActionValue;
  category?: AuditCategory;
  serverId?: string | null;
  details?: Record<string, unknown>;
  result?: AuditResult;
  error?: string | null;
}

export type ExtAudit = (entry: ExtAuditEntry) => void;

/** Inside a route handler the entry goes to the caller, otherwise to the extension */
export function createExtAudit(
  audit: Pick<AuditLogService, "record">,
  ext: { id: string; name: string },
): ExtAudit {
  return (entry) => {
    const actor = extActor.getStore();
    audit.record({
      action: entry.action,
      category: entry.category ?? AuditCategory.SETTINGS,
      resourceType: "extension",
      resourceId: ext.id,
      resourceName: ext.name,
      serverId: entry.serverId ?? null,
      details: entry.details ?? null,
      result: entry.result ?? AuditResult.SUCCESS,
      error: entry.error ?? null,
      userId: actor?.userId ?? null,
      username: actor?.username ?? ext.name,
      ip: actor?.ip ?? null,
      userAgent: actor?.userAgent ?? null,
      apiKeyId: actor?.apiKeyId ?? null,
      apiKeyName: actor?.apiKeyName ?? null,
      source: "extension",
    });
  };
}
