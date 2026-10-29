import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AccessArea, type AccessMap } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import * as bcrypt from "bcryptjs";
import type { AddressInfo } from "net";
import { AppEventsService } from "@/core/events/app-events.service";
import { BadResponseFilter } from "@/core/middlewares/badResponseFilter";
import { validationPipe } from "@/core/middlewares/validationPipe";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { AuthController } from "@/modules/auth/auth.controller";
import { AuthService } from "@/modules/auth/auth.service";
import { TwofaService } from "@/modules/auth/twofa/twofa.service";
import { ConfigService } from "@/modules/config/config.service";
import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { AuthChallengesRepository } from "@/modules/database/repositories/auth-challenges.repository";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { FtpCredentialsRepository } from "@/modules/database/repositories/ftp-credentials.repository";
import { RolesRepository } from "@/modules/database/repositories/roles.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { UserSessionsRepository } from "@/modules/database/repositories/user-sessions.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { PasswordRecheckService } from "@/modules/rate-limit/password-recheck.service";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import { RolesController } from "@/modules/roles/roles.controller";
import { RolesService } from "@/modules/roles/roles.service";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { BotTwofaService } from "@/modules/telegram-bot/bot-twofa.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import { testUser } from "@/testing/user";
import { AccountFtpPasswordController } from "./account-ftp-password.controller";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { FtpPasswordService } from "./ftp-password.service";

const PASSWORD = "correct horse";
const { ACCOUNTS, CONSOLE } = AccessArea;

let app: INestApplication;
let base: string;
let chatRole: string;

function account(
  id: string,
  grants: AccessMap = {},
  extra: Partial<IUser> = {},
): IUser {
  return testUser(id, {
    password: bcrypt.hashSync(PASSWORD, 4),
    grants,
    ...extra,
  });
}

async function login(username: string, password = PASSWORD) {
  return fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

async function token(username: string): Promise<string> {
  const res = await login(username);
  expect(res.status).toBe(200);
  return ((await res.json()) as { token: string }).token;
}

function send(
  method: string,
  path: string,
  auth: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${auth}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(async () => {
  const sqlite = sqliteProvider();
  const users = new UsersRepository(sqlite);
  const accounts = new AccountsService(users);
  const servers = new ServersRepository(sqlite);
  const events = new AppEventsService();
  const audit = new AuditLogService(new AuditLogsRepository(sqlite), servers);
  const rateLimit = new RateLimitService(events, audit);
  const sessions = new SessionsService(
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
    fake<BotTwofaService>({ setTwofaResolver: () => {} }),
    new ConfigService(new ConfigRepository(sqlite)),
    rateLimit,
    new PasswordRecheckService(rateLimit),
  );
  const roles = new RolesService(new RolesRepository(sqlite), users, events);

  const admin = account("admin", {}, { isAdmin: true });
  users.create(admin);
  chatRole = roles.create(admin, {
    name: "Chat",
    grants: { [CONSOLE]: "read" },
  }).id;
  // accounts manage, but only on server a
  users.create(
    account(
      "manager",
      { [ACCOUNTS]: "manage", [CONSOLE]: "write" },
      { serversRestrict: { enabled: true, allowed: ["a"] } },
    ),
  );
  users.create(account("viewer1", {}, { roles: [chatRole] }));
  users.create(
    account(
      "scoped",
      { [CONSOLE]: "read" },
      { serversRestrict: { enabled: true, allowed: ["a"] } },
    ),
  );

  const moduleRef = await Test.createTestingModule({
    controllers: [
      AuthController,
      AccountsController,
      AccountFtpPasswordController,
      RolesController,
    ],
    providers: [
      { provide: AuthService, useValue: new AuthService(accounts) },
      { provide: AccountsService, useValue: accounts },
      { provide: SessionsService, useValue: sessions },
      { provide: RateLimitService, useValue: rateLimit },
      { provide: TwofaService, useValue: twofa },
      {
        provide: PasswordRecheckService,
        useValue: new PasswordRecheckService(rateLimit),
      },
      { provide: ServersRepository, useValue: servers },
      {
        provide: FtpPasswordService,
        useValue: new FtpPasswordService(new FtpCredentialsRepository(sqlite)),
      },
      { provide: AppEventsService, useValue: events },
      { provide: RolesService, useValue: roles },
      { provide: AuditLogService, useValue: audit },
    ],
  }).compile();

  app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalFilters(new BadResponseFilter());
  app.useGlobalPipes(validationPipe);
  await app.listen(0, "127.0.0.1");
  const { port } = app.getHttpServer().address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await app?.close();
});

describe("server restricted account manager over HTTP", () => {
  test("can't reset the password of an account that sees all servers", async () => {
    const rm = await token("manager");

    const res = await send("PUT", "/api/accounts/viewer1", rm, {
      password: "taken over",
    });

    expect(res.status).toBe(403);
    expect((await login("viewer1", "taken over")).status).toBe(401);
    expect((await login("viewer1")).status).toBe(200);
  });

  test("can't reset the FTP password of such an account", async () => {
    const rm = await token("manager");

    const res = await send("POST", "/api/accounts/viewer1/ftp-password", rm);

    expect(res.status).toBe(403);
  });

  test("can't delete such an account", async () => {
    const rm = await token("manager");

    expect((await send("DELETE", "/api/accounts/viewer1", rm)).status).toBe(
      403,
    );
    expect((await login("viewer1")).status).toBe(200);
  });

  test("still manages accounts limited to its own servers", async () => {
    const rm = await token("manager");

    const res = await send("PUT", "/api/accounts/scoped", rm, {
      password: "new secret",
    });

    expect(res.status).toBe(204);
    expect((await login("scoped", "new secret")).status).toBe(200);
  });

  test("can't edit or delete a role held outside its servers", async () => {
    const rm = await token("manager");

    const update = await send("PUT", `/api/roles/${chatRole}`, rm, {
      grants: { [CONSOLE]: "write" },
    });
    const remove = await send("DELETE", `/api/roles/${chatRole}`, rm);

    expect(update.status).toBe(403);
    expect(remove.status).toBe(403);
  });
});
