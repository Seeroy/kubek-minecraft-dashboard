import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { testUser } from "@/testing/user";
import type { Database } from "bun:sqlite";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AppEventsService } from "@/core/events/app-events.service";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UserSessionsRepository } from "@/modules/database/repositories/user-sessions.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { fake } from "@/testing/fake";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import { SessionsService } from "./sessions.service";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-01-01T00:00:00Z").getTime();

let db: Database;
let repo: UserSessionsRepository;
let accounts: AccountsService;
let service: SessionsService;

function addUser(id: string): void {
  new UsersRepository(sqliteProvider(db)).create(testUser(id));
}

beforeEach(() => {
  setSystemTime(START);
  db = memoryDatabase();
  const sqlite = sqliteProvider(db);
  repo = new UserSessionsRepository(sqlite);
  accounts = new AccountsService(new UsersRepository(sqlite));
  service = new SessionsService(
    repo,
    accounts,
    new ExtensionEventBus(new ServersRepository(sqlite)),
    new AppEventsService(),
  );
  addUser("alice");
  addUser("bob");
});

afterEach(() => {
  setSystemTime();
});

describe("SessionsService", () => {
  test("a new session authenticates its owner by token", () => {
    const { token, session } = service.create("alice", "10.0.0.1", "curl");

    const result = service.authenticate(token);

    expect(result.user.id).toBe("alice");
    expect(result.session.id).toBe(session.id);
    expect(result.session.ip).toBe("10.0.0.1");
  });

  test("only a hash of the token is stored", () => {
    const { token, session } = service.create("alice", null, null);

    const stored = repo.findById(session.id);

    expect(stored?.tokenHash).toHaveLength(64);
    expect(stored?.tokenHash).not.toBe(token);
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  test("tokens of two sessions differ", () => {
    const a = service.create("alice", null, null);
    const b = service.create("alice", null, null);

    expect(a.token).not.toBe(b.token);
    expect(a.token).toHaveLength(64);
  });

  test("unknown token is rejected", () => {
    service.create("alice", null, null);

    expect(() => service.authenticate("f".repeat(64))).toThrow(
      UnauthorizedException,
    );
  });

  test("empty token finds nothing", () => {
    service.create("alice", null, null);

    expect(service.findByToken("")).toBeNull();
  });

  test("revoked session no longer authenticates", () => {
    const { token, session } = service.create("alice", null, null);

    service.revoke(session.id);

    expect(() => service.authenticate(token)).toThrow(UnauthorizedException);
  });

  test("revoking an unknown session is a 404", () => {
    expect(() => service.revoke("missing")).toThrow(NotFoundException);
  });

  test("session expires 30 days after creation without activity", () => {
    const { token } = service.create("alice", null, null);

    setSystemTime(START + 30 * DAY - 1000);
    expect(service.findByToken(token)).not.toBeNull();

    setSystemTime(START + 30 * DAY + 1000);
    expect(() => service.authenticate(token)).toThrow(UnauthorizedException);
  });

  test("activity slides the expiry forward", () => {
    const { token } = service.create("alice", null, null);

    setSystemTime(START + 20 * DAY);
    service.authenticate(token);

    setSystemTime(START + 45 * DAY);
    expect(service.authenticate(token).user.id).toBe("alice");
  });

  test("activity is written at most once per 30 seconds", () => {
    const { token, session } = service.create("alice", null, null);

    setSystemTime(START + 60_000);
    service.authenticate(token);
    setSystemTime(START + 70_000);
    service.authenticate(token);

    expect(repo.findById(session.id)?.lastSeenAt).toBe(START + 60_000);
  });

  test("session of a deleted account stops working", () => {
    const { token } = service.create("alice", null, null);

    accounts.delete("alice");

    expect(() => service.authenticate(token)).toThrow(UnauthorizedException);
  });

  test("session whose user cannot be loaded is rejected", () => {
    const { token } = service.create("alice", null, null);
    const orphaned = new SessionsService(
      repo,
      fake<AccountsService>({ findById: () => null }),
      fake<ExtensionEventBus>(),
      fake<AppEventsService>(),
    );

    expect(() => orphaned.authenticate(token)).toThrow(
      "User not found for session",
    );
  });

  test("revoke all keeps the current session and other users' sessions", () => {
    const current = service.create("alice", null, null);
    const other = service.create("alice", null, null);
    const bobs = service.create("bob", null, null);

    service.revokeAllForUser("alice", current.session.id);

    expect(service.authenticate(current.token).user.id).toBe("alice");
    expect(() => service.authenticate(other.token)).toThrow(
      UnauthorizedException,
    );
    expect(service.authenticate(bobs.token).user.id).toBe("bob");
  });

  test("revoke all without an exception ends every session of the user", () => {
    const a = service.create("alice", null, null);
    const b = service.create("alice", null, null);

    service.revokeAllForUser("alice");

    expect(service.findByToken(a.token)).toBeNull();
    expect(service.findByToken(b.token)).toBeNull();
  });

  test("session list shows only the user's live sessions and marks the current one", () => {
    const current = service.create("alice", "10.0.0.1", "firefox");
    const revoked = service.create("alice", null, null);
    service.create("bob", null, null);
    service.revoke(revoked.session.id);

    const list = service.listForUser("alice", current.session.id);

    expect(list).toEqual([
      {
        id: current.session.id,
        ip: "10.0.0.1",
        userAgent: "firefox",
        createdAt: START,
        lastSeenAt: START,
        expiresAt: START + 30 * DAY,
        current: true,
      },
    ]);
  });

  test("expired session leaves the list before cleanup runs", () => {
    const { session } = service.create("alice", null, null);

    setSystemTime(START + 31 * DAY);
    expect(service.listForUser("alice")).toEqual([]);

    service.cleanupExpired();
    expect(service.listForUser("alice")).toEqual([]);
    expect(repo.findById(session.id)).toBeNull();
  });

  test("cleanup keeps live sessions", () => {
    const { token } = service.create("alice", null, null);

    setSystemTime(START + DAY);
    service.cleanupExpired();

    expect(service.authenticate(token).user.id).toBe("alice");
  });
});
