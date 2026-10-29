import { SetMetadata } from "@nestjs/common";
import type { AuditCategory, AuditChange } from "@shared/types/audit.types";
import type { ITask } from "@shared/types/task.types";
import type { Request } from "express";

export const AUDIT_META_KEY = "audit:meta";

/** Per-action overrides resolved from the request and/or handler result */
export interface AuditResolved {
  skip?: boolean;
  /** Override the recorded action */
  action?: string;
  /** Override the recorded category alongside an action override */
  category?: AuditCategory;
  userId?: string | null;
  username?: string | null;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  /** Server the action touched, found from @CheckServerAccess when left out */
  serverId?: string;
  serverName?: string;
  changes?: AuditChange[];
  details?: Record<string, unknown>;
}

export interface AuditMeta {
  action: string;
  category: AuditCategory;
  resourceType?: string;
  /**
   * Enrich the success record (resource name/id, details). result is unwrapped,
   * task is the background task the handler answered with
   */
  resolve?: (info: {
    req: Request;
    result: any;
    task?: ITask | null;
  }) => AuditResolved | undefined;
  /** Enrich the failed record (e.g. attempted username on a rejected login) */
  resolveError?: (info: {
    req: Request;
    error: any;
  }) => AuditResolved | undefined;
}

/**
 * Mark a controller handler for audit logging. The global AuditInterceptor
 * records success/failure with actor + request context after the handler runs
 */
export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_META_KEY, meta);

const AUDIT_NOTE = Symbol("audit:note");

/**
 * Lets a handler add what only it knows, such as a before and after diff.
 * Merged into the record on success and failure, resolve wins on conflicts
 */
export function auditNote(req: Request, note: AuditResolved): void {
  const holder = req as unknown as Record<symbol, AuditResolved | undefined>;
  const current = holder[AUDIT_NOTE];
  holder[AUDIT_NOTE] = {
    ...current,
    ...note,
    details: { ...current?.details, ...note.details },
  };
}

export function readAuditNote(req: Request): AuditResolved | undefined {
  return (req as unknown as Record<symbol, AuditResolved | undefined>)[
    AUDIT_NOTE
  ];
}
