import type { AuditMeta } from "@/modules/audit-log/audit.decorator";
import { AuditCategory } from "@shared/types/audit.types";
import type { Request } from "express";
import { posix } from "path";

type Body = Record<string, any>;

/** Audit meta for a file manager action, the server comes from the query */
export function fileAudit(
  action: string,
  describe: (
    body: Body,
    req: Request,
  ) => {
    path?: string;
    details?: Record<string, unknown>;
  },
): AuditMeta {
  const resolve = ({ req }: { req: Request }) => {
    const { path, details } = describe((req.body ?? {}) as Body, req);
    return { resourceName: path, details };
  };
  return {
    action,
    category: AuditCategory.SERVER,
    resourceType: "file",
    resolve,
    resolveError: resolve,
  };
}

export const joinPath = (dir: unknown, name: unknown) =>
  posix.join(
    typeof dir === "string" ? dir : "/",
    typeof name === "string" ? name : "",
  );
