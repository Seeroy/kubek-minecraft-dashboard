import { beforeEach, describe, expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import { HttpException, UnauthorizedException } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import * as bcrypt from "bcryptjs";
import type { Request } from "express";
import type { Socket } from "net";
import { AppEventsService } from "@/core/events/app-events.service";
import { testUser } from "@/testing/user";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { ConfigService } from "@/modules/config/config.service";
import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { AuthChallengesRepository } from "@/modules/database/repositories/auth-challenges.repository";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { UserSessionsRepository } from "@/modules/database/repositories/user-sessions.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { PasswordRecheckService } from "@/modules/rate-limit/password-recheck.service";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { BotTwofaService } from "@/modules/telegram-bot/bot-twofa.service";
import { fake } from "@/testing/fake";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import type { LoginResponseDto } from "./dto/login-response.dto";
import { TwofaService } from "./twofa/twofa.service";

const PASSWORD = "correct horse";

let db: Database;
let users: UsersRepository;
let sessions: SessionsService;
let controller: AuthController;

function account(id: string, extra: Partial<IUser> = {}): IUser {
  return testUser(id, {
    password: bcrypt.hashSync(PASSWORD, 4),
    grants: { [AccessArea.CONSOLE]: "read" },
    ...extra,
  });
}

function request(ip = "10.0.0.5"): Request {
  return fake<Request>({
    headers: { "user-agent": "test-agent" },
    socket: fake<Socket>({ remoteAddress: ip }),
  });
}

const login = (username: string, password: string, ip?: string) =>
  controller.login({ username, password }, request(ip));

function caught(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (err: unknown) => err,
  );
}

function sessionCount(): number {
  return db.query("SELECT id FROM user_sessions").all().length;
}

beforeEach(() => {
  db = memoryDatabase();
  const sqlite = sqliteProvider(db);
  users = new UsersRepository(sqlite);
  const accounts = new AccountsService(users);
  const servers = new ServersRepository(sqlite);
  const events = new AppEventsService();
  const rateLimit = new RateLimitService(
    events,
    new AuditLogService(new AuditLogsRepository(sqlite), servers),
  );
  sessions = new SessionsService(
    new UserSessionsRepository(sqlite),
    accounts,
    new ExtensionEventBus(servers),
    events,
  );
  const twofa = new TwofaService(
    new AuthChallengesRepository(sqlite),
    new TelegramUsersRepository(sqlite),
    accounts,
    sessions,
    fake<BotTwofaService>(),
    new ConfigService(new ConfigRepository(sqlite)),
    rateLimit,
    new PasswordRecheckService(rateLimit),
  );
  controller = new AuthController(
    new AuthService(accounts),
    sessions,
    rateLimit,
    twofa,
  );

  users.create(account("alice"));
  users.create(
    account("totpuser", {
      totpEnabled: true,
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
    }),
  );
});

describe("AuthController.login", () => {
  test("valid credentials return a token for a new session", async () => {
    const result = await login("alice", PASSWORD);

    if (!result.token) throw new Error("no token");
    const auth = sessions.authenticate(result.token);
    expect(auth.user.id).toBe("alice");
    expect(auth.session.ip).toBe("10.0.0.5");
    expect(auth.session.userAgent).toBe("test-agent");
  });

  test("login response does not leak the password hash or TOTP secret", async () => {
    const result = await login("alice", PASSWORD);

    expect(result.user).toEqual({
      id: "alice",
      username: "alice",
      roles: [],
      grants: { [AccessArea.CONSOLE]: "read" },
      extPermissions: [],
      access: { levels: { [AccessArea.CONSOLE]: "read" }, ext: [] },
      serversRestrict: { enabled: false, allowed: [] },
      isAdmin: false,
      oobeCompleted: false,
      skinName: null,
      ftpPasswordSetAt: null,
    });
  });

  test("wrong password is a 401 and creates no session", async () => {
    const err = await caught(login("alice", "wrong"));

    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(sessionCount()).toBe(0);
  });

  test("unknown user gets the same 401 as a wrong password", async () => {
    const unknown = await caught(login("mallory", PASSWORD));
    const wrong = await caught(login("alice", "wrong"));

    expect(unknown).toBeInstanceOf(UnauthorizedException);
    expect((unknown as Error).message).toBe((wrong as Error).message);
  });

  test("repeated wrong passwords lock the account even for the right one", async () => {
    for (let i = 0; i < 6; i++) {
      expect(await caught(login("alice", "wrong"))).toBeInstanceOf(
        UnauthorizedException,
      );
    }

    const err = await caught(login("alice", PASSWORD));

    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    expect(sessionCount()).toBe(0);
  });

  test("username case does not reset the lock", async () => {
    for (let i = 0; i < 6; i++) await caught(login("alice", "wrong"));

    const err = await caught(login("ALICE", "wrong"));

    expect((err as HttpException).getStatus()).toBe(429);
  });

  test("successful login clears earlier failures", async () => {
    for (let i = 0; i < 5; i++) await caught(login("alice", "wrong"));
    await login("alice", PASSWORD);
    for (let i = 0; i < 5; i++) await caught(login("alice", "wrong"));

    const result = await login("alice", PASSWORD);

    expect(typeof result.token).toBe("string");
  });

  test("lock on one account does not affect another", async () => {
    users.create(account("bob"));
    for (let i = 0; i < 6; i++) await caught(login("alice", "wrong"));

    const result = await login("bob", PASSWORD);

    expect(typeof result.token).toBe("string");
  });

  test("account with 2FA gets a challenge instead of a token", async () => {
    const result: LoginResponseDto = await login("totpuser", PASSWORD);

    expect(result).toMatchObject({
      require2fa: true,
      primary: "totp",
      methods: ["totp"],
    });
    expect(typeof result.challengeId).toBe("string");
    expect(result.token).toBeUndefined();
    expect(result.user).toBeUndefined();
    expect(sessionCount()).toBe(0);
  });

  test("wrong password for a 2FA account never reaches the challenge", async () => {
    expect(await caught(login("totpuser", "wrong"))).toBeInstanceOf(
      UnauthorizedException,
    );
    expect(db.query("SELECT id FROM auth_challenges").all()).toEqual([]);
  });
});

describe("AuthController session endpoints", () => {
  test("logout revokes the current session only", async () => {
    const first = await login("alice", PASSWORD);
    const second = await login("alice", PASSWORD);
    const current = sessions.authenticate(first.token!).session;

    controller.logout(current);

    expect(sessions.findByToken(first.token!)).toBeNull();
    expect(sessions.authenticate(second.token!).user.id).toBe("alice");
  });

  test("profile returns the public view of the user", () => {
    const profile = controller.getProfile(users.findById("alice")!);

    expect(Object.keys(profile)).not.toContain("password");
    expect(Object.keys(profile)).not.toContain("totpSecret");
    expect(profile.username).toBe("alice");
  });

  test("completing onboarding is stored on the account", () => {
    controller.completeOOBE(users.findById("alice")!);

    expect(users.findById("alice")?.oobeCompleted).toBe(true);
  });
});
