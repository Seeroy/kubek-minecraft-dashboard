import { SetMetadata } from "@nestjs/common";
import type { AuditCategory } from "@shared/types/audit.types";
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
  details?: Record<string, unknown>;
}

export interface AuditMeta {
  action: string;
  category: AuditCategory;
  resourceType?: string;
  /** Enrich the success record (resource name/id, details). result is unwrapped */
  resolve?: (info: { req: Request; result: any }) => AuditResolved | undefined;
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
