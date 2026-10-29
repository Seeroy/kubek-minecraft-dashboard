import { diffChanges } from "@/modules/audit-log/audit-diff";
import type { AuditMeta } from "@/modules/audit-log/audit.decorator";
import { AuditCategory, type AuditChange } from "@shared/types/audit.types";
import type { IServer } from "@shared/types/server/server.types";
import type { Request } from "express";

/** Audit meta for an action on one server */
export const serverAudit = (
  action: string,
  extra?: Partial<AuditMeta>,
): AuditMeta => ({
  action,
  category: AuditCategory.SERVER,
  resourceType: "server",
  ...extra,
});

/** Multipart routes send their JSON in a payload field */
export function payloadOf(req: Request): Record<string, any> {
  try {
    const raw = (req.body as { payload?: string })?.payload ?? "{}";
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    return {};
  }
}

const settingsOf = (server: IServer) => ({
  name: server.name,
  restartOnError: server.restartOnError,
  variables: server.variables,
});

/** Settings edit as changes, blueprint variables carry their labels */
export function settingsChanges(
  before: IServer,
  after: IServer,
  labels: Record<string, string>,
): AuditChange[] {
  return diffChanges(settingsOf(before), settingsOf(after), { labels });
}
