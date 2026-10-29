import { extractClientIp } from "@/core/utils/request";
import {
  requestServerId,
  SERVER_ACCESS_KEY,
} from "@/modules/auth/guards/server-access.guard";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { TasksService } from "@/modules/tasks/tasks.service";
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
import {
  AUDIT_META_KEY,
  readAuditNote,
  type AuditMeta,
  type AuditResolved,
} from "./audit.decorator";

// Optional fields a resolver left empty are dropped, an empty object is no details
function compact(
  details: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  const entries = Object.entries(details ?? {}).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  return entries.length ? Object.fromEntries(entries) : null;
}

interface ServerTarget {
  id: string | null;
  name: string | null;
}

/**
 * Global interceptor that records an audit entry for handlers annotated with
 * @Audit(...). Captures actor (req.user), IP and user-agent, the server from
 * @CheckServerAccess and the success/failure outcome. Other handlers pass
 * through untouched
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog: AuditLogService,
    private readonly servers: ServersRepository,
    private readonly tasks: TasksService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_META_KEY,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const serverField = this.reflector.getAllAndOverride<string | undefined>(
      SERVER_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Looked up before the handler so a deleted server keeps its name
    const target = this.serverTarget(req, serverField);

    return next.handle().pipe(
      tap({
        next: (raw) => {
          const result = this.unwrap(raw);
          const task = this.taskOf(result);
          const extra = this.merge(req, meta.resolve?.({ req, result, task }));
          if (extra.skip) return;
          this.write(meta, req, extra, target, AuditResult.SUCCESS);
        },
        error: (error) => {
          const extra = this.merge(req, meta.resolveError?.({ req, error }));
          const message = error?.message ? String(error.message) : "Error";
          this.write(meta, req, extra, target, AuditResult.FAILED, message);
        },
      }),
    );
  }

  private write(
    meta: AuditMeta,
    req: Request,
    extra: AuditResolved,
    target: ServerTarget,
    result: AuditResult,
    error?: string,
  ): void {
    const user = (req as Request & { user?: { id: string; username: string } })
      .user;
    const resourceType = extra.resourceType ?? meta.resourceType ?? null;
    const resourceId =
      extra.resourceId ?? (req.params?.id as string | undefined) ?? null;
    const serverId =
      extra.serverId ??
      target.id ??
      (resourceType === "server" ? resourceId : null);
    const serverName =
      extra.serverName ?? (serverId === target.id ? target.name : null);
    const resourceName =
      extra.resourceName ?? (resourceType === "server" ? serverName : null);

    this.auditLog.record({
      action: extra.action ?? meta.action,
      category: extra.category ?? meta.category,
      resourceType,
      resourceId,
      resourceName,
      serverId,
      serverName,
      changes: extra.changes?.length ? extra.changes : null,
      details: compact(extra.details),
      result,
      error: error ?? null,
      userId: extra.userId ?? user?.id ?? null,
      username:
        extra.username ??
        user?.username ??
        (req.body as { username?: string } | undefined)?.username ??
        "unknown",
      ip: extractClientIp(req),
      userAgent: req.headers?.["user-agent"] ?? null,
      source: "panel",
    });
  }

  // The handler note goes first, resolve fills in what it computed afterwards
  private merge(
    req: Request,
    resolved: AuditResolved | undefined,
  ): AuditResolved {
    const note = readAuditNote(req);
    const defined = Object.fromEntries(
      Object.entries(resolved ?? {}).filter(([, value]) => value !== undefined),
    );
    return {
      ...note,
      ...defined,
      details: { ...note?.details, ...resolved?.details },
    };
  }

  private serverTarget(req: Request, field: string | undefined): ServerTarget {
    const id = field ? requestServerId(req, field) : null;
    return { id, name: id ? (this.servers.findById(id)?.name ?? null) : null };
  }

  private taskOf(result: any) {
    const id = result?.taskId ?? result?.task?.id;
    return typeof id === "string" ? this.tasks.getTask(id) : null;
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
