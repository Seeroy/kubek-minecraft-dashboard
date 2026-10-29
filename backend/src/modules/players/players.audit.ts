import type { AuditMeta } from "@/modules/audit-log/audit.decorator";
import { AuditCategory } from "@shared/types/audit.types";
import type { Request } from "express";

type Target = (req: Request) => string | undefined;

const bodyField =
  (field: string): Target =>
  (req) =>
    (req.body as Record<string, unknown> | undefined)?.[field] as
      string | undefined;

const param =
  (field: string): Target =>
  (req) =>
    req.params?.[field] as string | undefined;

export const fromBody = { name: bodyField("name"), ip: bodyField("ip") };
export const fromParam = { name: param("name"), ip: param("ip") };

/** Audit meta for a change of one player or address on one server */
export function playersAudit(
  action: string,
  target: Target,
  details?: (req: Request) => Record<string, unknown>,
): AuditMeta {
  // The server comes from the route through @CheckServerAccess
  const resolve = ({ req }: { req: Request }) => ({
    resourceName: target(req),
    details: details?.(req),
  });
  return {
    action,
    category: AuditCategory.SERVER,
    resourceType: "player",
    resolve,
    resolveError: resolve,
  };
}
