import { AppEventsService } from "@/core/events/app-events.service";
import { ApiErrorCode } from "@/core/errors/error-codes";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { ApiKeysRepository } from "@/modules/database/repositories/api-keys.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AccessArea } from "@shared/access/areas";
import { can } from "@shared/access/can";
import type { ApiKeyView, IApiKey } from "@shared/types/api-key.types";
import type { IUser } from "@shared/types/user.types";
import { createHash, randomBytes, randomUUID } from "crypto";
import {
  keyGrantsVerdict,
  keyServersVerdict,
  narrowToKey,
} from "./api-key-access";

export const API_KEY_PREFIX = "kbk_";
const PREFIX_LENGTH = API_KEY_PREFIX.length + 8;
const TOUCH_THROTTLE_MS = 60_000;

export interface ApiKeyInput {
  name: string;
  grants: Record<string, string>;
  servers: string[] | null;
  mcp: boolean;
  expiresAt?: number | null;
}

export const isApiKeyToken = (token: string) =>
  token.startsWith(API_KEY_PREFIX);

@Injectable()
export class ApiKeysService {
  private readonly lastTouch = new Map<string, number>();

  constructor(
    private readonly keys: ApiKeysRepository,
    private readonly accounts: AccountsService,
    private readonly servers: ServersRepository,
    private readonly rateLimit: RateLimitService,
    private readonly events: AppEventsService,
  ) {}

  /** The owner cut down to the key, same shape the session auth gives */
  authenticate(token: string, ip: string | null): IUser {
    const key = this.keys.findByTokenHash(hashToken(token));
    const now = Date.now();
    if (!key || (key.expiresAt !== null && key.expiresAt <= now)) {
      throw new UnauthorizedException("Invalid API key");
    }
    const owner = this.accounts.findById(key.userId);
    // Taking api away from the owner switches the keys off too
    if (!owner || !can(owner, AccessArea.API, "write")) {
      throw new UnauthorizedException("Invalid API key");
    }

    this.rateLimit.hit("api.key", key.id);
    this.touch(key.id, now, ip);
    return narrowToKey(owner, key);
  }

  /** A fresh copy of the user, cut down again when it came with a key */
  reload(
    stored: IUser | undefined,
    fresh: IUser | null | undefined,
  ): IUser | undefined {
    if (!fresh) return undefined;
    if (!stored?.apiKey) return fresh;
    const key = this.keys.findById(stored.apiKey.id);
    if (!key || (key.expiresAt !== null && key.expiresAt <= Date.now())) {
      return undefined;
    }
    if (!can(fresh, AccessArea.API, "write")) return undefined;
    return narrowToKey(fresh, key);
  }

  listOwn(userId: string): ApiKeyView[] {
    return this.keys.findByUserId(userId).map((key) => toView(key));
  }

  listAll(): ApiKeyView[] {
    const names = new Map<string, string>();
    return this.keys.findAll().map((key) => {
      if (!names.has(key.userId)) {
        names.set(
          key.userId,
          this.accounts.findById(key.userId)?.username ?? "?",
        );
      }
      return toView(key, names.get(key.userId));
    });
  }

  create(owner: IUser, input: ApiKeyInput): { key: ApiKeyView; token: string } {
    this.assertAllowed(owner, input.grants, input.servers);
    if (input.expiresAt != null && input.expiresAt <= Date.now()) {
      throw new ForbiddenException("Expiry date is in the past");
    }

    const token = API_KEY_PREFIX + randomBytes(32).toString("base64url");
    const key: IApiKey = {
      id: randomUUID(),
      userId: owner.id,
      name: input.name.trim(),
      prefix: token.slice(0, PREFIX_LENGTH),
      tokenHash: hashToken(token),
      grants: input.grants,
      servers: input.servers,
      mcp: input.mcp,
      createdAt: Date.now(),
      expiresAt: input.expiresAt ?? null,
      lastUsedAt: null,
      lastUsedIp: null,
    };
    this.keys.create(key);
    return { key: toView(key), token };
  }

  /** Only the owner edits a key, admins of keys can just revoke them */
  update(owner: IUser, id: string, input: Partial<ApiKeyInput>): ApiKeyView {
    const key = this.keys.findById(id);
    if (!key || key.userId !== owner.id) {
      throw new NotFoundException("API key not found");
    }
    this.assertAllowed(
      owner,
      input.grants ?? key.grants,
      input.servers !== undefined ? input.servers : key.servers,
    );
    this.keys.update(id, {
      name: input.name?.trim(),
      grants: input.grants,
      servers: input.servers,
      mcp: input.mcp,
    });
    this.events.emit("api_key.changed", { userId: key.userId, keyId: id });
    return toView(this.keys.findById(id)!);
  }

  delete(actor: IUser, id: string): IApiKey {
    const key = this.keys.findById(id);
    const mayDelete =
      key && (key.userId === actor.id || can(actor, AccessArea.API, "manage"));
    if (!key || !mayDelete) throw new NotFoundException("API key not found");
    this.keys.delete(id);
    this.lastTouch.delete(id);
    this.events.emit("api_key.changed", { userId: key.userId, keyId: id });
    return key;
  }

  find(id: string): IApiKey | null {
    return this.keys.findById(id);
  }

  @Cron(CronExpression.EVERY_HOUR)
  cleanupExpired(): void {
    this.keys.deleteExpired(Date.now());
  }

  private assertAllowed(
    owner: IUser,
    grants: Record<string, string>,
    servers: string[] | null,
  ): void {
    const verdict =
      keyGrantsVerdict(owner, grants) ??
      keyServersVerdict(owner, servers, (id) => !!this.servers.findById(id));
    if (verdict) {
      throw new ForbiddenException({
        code: ApiErrorCode.ACCESS_ESCALATION,
        message: verdict,
      });
    }
  }

  private touch(id: string, now: number, ip: string | null): void {
    if (now - (this.lastTouch.get(id) ?? 0) < TOUCH_THROTTLE_MS) return;
    this.lastTouch.set(id, now);
    this.keys.touch(id, now, ip);
  }
}

function toView(key: IApiKey, username?: string): ApiKeyView {
  const { tokenHash, ...view } = key;
  void tokenHash;
  return username === undefined ? view : { ...view, username };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
