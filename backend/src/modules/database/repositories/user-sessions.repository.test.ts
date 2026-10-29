import { beforeEach, describe, expect, test } from "bun:test";
import { testUser } from "@/testing/user";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import type { IUserSession } from "@shared/types/session.types";
import type { IUser } from "@shared/types/user.types";
import { UserSessionsRepository } from "./user-sessions.repository";
import { UsersRepository } from "./users.repository";

let sessions: UserSessionsRepository;
let users: UsersRepository;

const user = (id: string): IUser => testUser(id);

const session = (
  id: string,
  extra: Partial<IUserSession> = {},
): IUserSession => ({
  id,
  userId: "alice",
  tokenHash: `hash-${id}`,
  ip: null,
  userAgent: null,
  createdAt: 100,
  lastSeenAt: 100,
  expiresAt: null,
  revokedAt: null,
  ...extra,
});

beforeEach(() => {
  const provider = sqliteProvider(memoryDatabase());
  sessions = new UserSessionsRepository(provider);
  users = new UsersRepository(provider);
  users.create(user("alice"));
  users.create(user("bob"));
});

describe("UserSessionsRepository", () => {
  test("a session reads back unchanged", () => {
    const full = session("s1", {
      ip: "10.0.0.1",
      userAgent: "Firefox",
      expiresAt: 500,
      revokedAt: 300,
    });
    sessions.create(full);
    expect(sessions.findById("s1")).toEqual(full);
    expect(sessions.findById("nope")).toBeNull();
  });

  test("a token only matches while the session is live", () => {
    sessions.create(session("forever"));
    sessions.create(session("later", { expiresAt: 200 }));
    sessions.create(session("expired", { expiresAt: 150 }));
    sessions.create(session("revoked", { revokedAt: 120 }));

    expect(sessions.findByTokenHash("hash-forever", 150)?.id).toBe("forever");
    expect(sessions.findByTokenHash("hash-later", 150)?.id).toBe("later");
    expect(sessions.findByTokenHash("hash-expired", 150)).toBeNull();
    expect(sessions.findByTokenHash("hash-revoked", 150)).toBeNull();
  });

  test("active sessions of a user come most recently seen first", () => {
    sessions.create(session("old", { lastSeenAt: 100 }));
    sessions.create(session("new", { lastSeenAt: 300 }));
    sessions.create(session("mid", { lastSeenAt: 200 }));
    sessions.create(session("gone", { lastSeenAt: 400, revokedAt: 400 }));
    sessions.create(session("bobs", { userId: "bob", lastSeenAt: 500 }));
    sessions.create(session("stale", { lastSeenAt: 50, expiresAt: 120 }));

    expect(sessions.findActiveByUserId("alice", 150).map((s) => s.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  test("touch extends a live session but not a revoked one", () => {
    sessions.create(session("live", { expiresAt: 200 }));
    sessions.create(session("dead", { expiresAt: 200, revokedAt: 150 }));

    sessions.touch("live", 180, 900);
    sessions.touch("dead", 180, 900);

    expect(sessions.findById("live")).toMatchObject({
      lastSeenAt: 180,
      expiresAt: 900,
    });
    expect(sessions.findById("dead")).toMatchObject({
      lastSeenAt: 100,
      expiresAt: 200,
    });
  });

  test("revoking twice keeps the first revoke time", () => {
    sessions.create(session("s1"));
    sessions.revoke("s1", 200);
    sessions.revoke("s1", 300);
    expect(sessions.findById("s1")?.revokedAt).toBe(200);
  });

  test("revoking all sessions of a user can spare the current one", () => {
    sessions.create(session("current"));
    sessions.create(session("other"));
    sessions.create(session("bobs", { userId: "bob" }));

    sessions.revokeAllForUser("alice", 500, "current");
    expect(sessions.findActiveByUserId("alice", 150).map((s) => s.id)).toEqual([
      "current",
    ]);
    expect(sessions.findById("bobs")?.revokedAt).toBeNull();

    sessions.revokeAllForUser("alice", 600);
    expect(sessions.findActiveByUserId("alice", 150)).toEqual([]);
    expect(sessions.findById("other")?.revokedAt).toBe(500);
  });

  test("deleteExpired removes only sessions that ran out before now", () => {
    sessions.create(session("forever"));
    sessions.create(session("past", { expiresAt: 99 }));
    sessions.create(session("edge", { expiresAt: 100 }));
    sessions.create(session("future", { expiresAt: 101 }));

    sessions.deleteExpired(100);

    expect(sessions.findById("past")).toBeNull();
    expect(sessions.findById("edge")?.id).toBe("edge");
    expect(sessions.findById("future")?.id).toBe("future");
    expect(sessions.findById("forever")?.id).toBe("forever");
  });

  test("token hashes are unique and the user must exist", () => {
    sessions.create(session("s1", { tokenHash: "same" }));
    expect(() => sessions.create(session("s2", { tokenHash: "same" }))).toThrow(
      "UNIQUE constraint failed: user_sessions.tokenHash",
    );
    expect(() => sessions.create(session("s3", { userId: "ghost" }))).toThrow(
      "FOREIGN KEY constraint failed",
    );
  });
});
