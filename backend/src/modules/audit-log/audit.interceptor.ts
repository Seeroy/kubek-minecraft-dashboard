import { extractClientIp } from "@/core/utils/request";
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuditResult } from "@shared/types/audit.types";
import type { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditLogService } from "./audit-log.service";
import { AUDIT_META_KEY, type AuditMeta } from "./audit.decorator";

/**
 * Global interceptor that records an audit entry for handlers annotated with
 * @Audit(...). Captures actor (req.user), IP and user-agent, and the
 * success/failure outcome. Other handlers pass through untouched
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_META_KEY,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest();
    const ip = extractClientIp(req as Request);
    const userAgent =
      (req.headers?.["user-agent"] as string | undefined) ?? null;
    const actorId: string | null = req.user?.id ?? null;
    const actorName: string | null = req.user?.username ?? null;

    return next.handle().pipe(
      tap({
        next: (raw) => {
          const result = this.unwrap(raw);
          const extra = meta.resolve?.({ req, result });
          if (extra?.skip) return;

          this.auditLog.record({
            action: extra?.action ?? meta.action,
            category: extra?.category ?? meta.category,
            resourceType: extra?.resourceType ?? meta.resourceType ?? null,
            resourceId: extra?.resourceId ?? req.params?.id ?? null,
            resourceName: extra?.resourceName ?? null,
            details: extra?.details ?? null,
            result: AuditResult.SUCCESS,
            userId: extra?.userId ?? actorId,
            username: extra?.username ?? actorName ?? "unknown",
            ip,
            userAgent,
            source: "panel",
          });
        },
        error: (error) => {
          const extra = meta.resolveError?.({ req, error });
          this.auditLog.record({
            action: extra?.action ?? meta.action,
            category: extra?.category ?? meta.category,
            resourceType: extra?.resourceType ?? meta.resourceType ?? null,
            resourceId: extra?.resourceId ?? req.params?.id ?? null,
            resourceName: extra?.resourceName ?? null,
            details: extra?.details ?? null,
            result: AuditResult.FAILED,
            error: error?.message ? String(error.message) : "Error",
            userId: actorId,
            username:
              extra?.username ?? actorName ?? req.body?.username ?? "unknown",
            ip,
            userAgent,
            source: "panel",
          });
        },
      }),
    );
  }

  private unwrap(raw: any): any {
    if (
      raw &&
      typeof raw === "object" &&
      raw.success === true &&
      "data" in raw
    ) {
      return raw.data;
    }
    return raw;
  }
}
