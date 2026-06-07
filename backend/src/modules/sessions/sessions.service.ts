import { AccountsService } from "@/modules/accounts/accounts.service";
import { UserSessionsRepository } from "@/modules/database/repositories/user-sessions.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import type {
  IUserSession,
  SessionPublicView,
} from "@shared/types/session.types";
import type { IUser } from "@shared/types/user.types";
import { createHash, randomBytes, randomUUID } from "crypto";

const TOKEN_BYTES = 32;
const TOUCH_THROTTLE_MS = 30_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class SessionsService {
  private readonly lastTouch = new Map<string, number>();

  constructor(
    private readonly sessions: UserSessionsRepository,
    private readonly accounts: AccountsService,
    private readonly bus: ExtensionEventBus,
  ) {}

  // Shared auth chain for both the HTTP guard and the WS gateway
  authenticate(token: string): { user: IUser; session: IUserSession } {
    const session = this.findByToken(token);
    if (!session) {
      throw new UnauthorizedException("Invalid token");
    }
    const user = this.accounts.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException("User not found for session");
    }
    this.touch(session.id);
    return { user, session };
  }

  create(
    userId: string,
    ip: string | null,
    userAgent: string | null,
  ): { token: string; session: IUserSession } {
    const token = randomBytes(TOKEN_BYTES).toString("hex");
    const tokenHash = hashToken(token);
    const now = Date.now();

    const session: IUserSession = {
      id: randomUUID(),
      userId,
      tokenHash,
      ip,
      userAgent,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + SESSION_TTL_MS,
      revokedAt: null,
    };

    this.sessions.create(session);
    this.bus.publish("user.login", { userId, ip: ip ?? "" });
    return { token, session };
  }

  findByToken(token: string): IUserSession | null {
    if (!token) return null;
    return this.sessions.findByTokenHash(hashToken(token), Date.now());
  }

  touch(sessionId: string): void {
    const now = Date.now();
    const previous = this.lastTouch.get(sessionId) ?? 0;
    if (now - previous < TOUCH_THROTTLE_MS) return;
    this.lastTouch.set(sessionId, now);
    // Sliding expiration: active sessions keep extending their lifetime
    this.sessions.touch(sessionId, now, now + SESSION_TTL_MS);
  }

  // Drop expired sessions from storage + clear the throttle map
  @Cron(CronExpression.EVERY_HOUR)
  cleanupExpired(): void {
    this.sessions.deleteExpired(Date.now());
    this.lastTouch.clear();
  }

  revoke(sessionId: string): void {
    const session = this.sessions.findById(sessionId);
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    this.sessions.revoke(sessionId, Date.now());
    this.lastTouch.delete(sessionId);
  }

  revokeAllForUser(userId: string, exceptSessionId?: string): void {
    this.sessions.revokeAllForUser(userId, Date.now(), exceptSessionId);
    if (exceptSessionId) {
      for (const id of this.lastTouch.keys()) {
        if (id !== exceptSessionId) this.lastTouch.delete(id);
      }
    } else {
      this.lastTouch.clear();
    }
  }

  listForUser(userId: string, currentSessionId?: string): SessionPublicView[] {
    return this.sessions.findActiveByUserId(userId).map((s) => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      expiresAt: s.expiresAt,
      current: s.id === currentSessionId,
    }));
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
