import { ApiErrorCode } from "@/core/errors/error-codes";
import { AppEventsService } from "@/core/events/app-events.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  AuditAction,
  AuditCategory,
  AuditResult,
} from "@shared/types/audit.types";
import { AttemptLimiter } from "./attempt-limiter";
import { ipKey } from "./ip-key";
import {
  RATE_LIMIT_POLICIES,
  type RateLimitPolicy,
} from "./rate-limit.policies";

/** Who a lock is about, for the owner notification and the audit log */
export interface LockSubject {
  userId?: string;
  username?: string;
  ip: string | null;
}

/**
 * Brute force protection for credential checks. State lives in memory,
 * a restart forgives everyone, which is fine for a single panel process
 */
@Injectable()
export class RateLimitService {
  private readonly limiters = new Map<RateLimitPolicy, AttemptLimiter>();

  constructor(
    private readonly events: AppEventsService,
    private readonly audit: AuditLogService,
  ) {
    for (const [name, policy] of Object.entries(RATE_LIMIT_POLICIES)) {
      this.limiters.set(name as RateLimitPolicy, new AttemptLimiter(policy));
    }
  }

  /** Seconds until the key may try again, for callers outside HTTP */
  waitSeconds(policy: RateLimitPolicy, key: string): number {
    return Math.ceil(this.limiter(policy).retryAfter(key, Date.now()) / 1000);
  }

  /** Throws 429 while the key is locked */
  check(policy: RateLimitPolicy, key: string): void {
    this.throwIfWaiting(this.limiter(policy).retryAfter(key, Date.now()));
  }

  /** Counts an attempt against a window policy, throws 429 over the cap */
  hit(policy: RateLimitPolicy, key: string): void {
    this.throwIfWaiting(this.limiter(policy).hit(key, Date.now()));
  }

  fail(policy: RateLimitPolicy, key: string, subject: LockSubject): void {
    const { lockMs, justLocked } = this.limiter(policy).fail(key, Date.now());
    if (!justLocked) return;
    const retryAfterSec = Math.ceil(lockMs / 1000);
    this.events.emit("auth.locked", { policy, ...subject, retryAfterSec });
    this.audit.record({
      action: AuditAction.AUTH_LOCKED,
      category: AuditCategory.AUTH,
      userId: subject.userId ?? null,
      username: subject.username ?? "?",
      result: AuditResult.FAILED,
      details: { policy, retryAfterSec },
      ip: subject.ip,
    });
  }

  succeed(policy: RateLimitPolicy, key: string): void {
    this.limiter(policy).reset(key);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  prune(): void {
    const now = Date.now();
    for (const limiter of this.limiters.values()) limiter.prune(now);
  }

  private limiter(policy: RateLimitPolicy): AttemptLimiter {
    return this.limiters.get(policy)!;
  }

  private throwIfWaiting(waitMs: number): void {
    if (waitMs <= 0) return;
    throw new HttpException(
      {
        code: ApiErrorCode.RATE_LIMITED,
        message: "Too many attempts, try again later",
        retryAfter: Math.ceil(waitMs / 1000),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/** Login key, usernames are matched case-insensitively by the limiter */
export const loginKey = (ip: string | null, username: string) =>
  `${ipKey(ip)}|${username.toLowerCase()}`;
