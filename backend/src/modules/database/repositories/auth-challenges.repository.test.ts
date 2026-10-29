import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { testUser } from "@/testing/user";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import {
  AuthChallengesRepository,
  type IAuthChallenge,
} from "./auth-challenges.repository";
import { UsersRepository } from "./users.repository";

const NOW = 10_000_000;
const HOUR = 60 * 60 * 1000;

let challenges: AuthChallengesRepository;
let users: UsersRepository;

const challenge = (
  id: string,
  extra: Partial<IAuthChallenge> = {},
): IAuthChallenge => ({
  id,
  userId: "alice",
  method: "totp",
  status: "pending",
  tgChatId: null,
  tgMessageId: null,
  ip: null,
  userAgent: null,
  issuedToken: null,
  createdAt: NOW - 1000,
  expiresAt: NOW + 1000,
  resolvedAt: null,
  attempts: 0,
  ...extra,
});

beforeEach(() => {
  setSystemTime(new Date(NOW));
  const provider = sqliteProvider(memoryDatabase());
  challenges = new AuthChallengesRepository(provider);
  users = new UsersRepository(provider);
  users.create(testUser("alice"));
});

afterEach(() => {
  setSystemTime();
});

describe("AuthChallengesRepository", () => {
  test("a challenge reads back with every field", () => {
    const full = challenge("c1", {
      method: "telegram",
      tgChatId: 123456789,
      tgMessageId: 42,
      ip: "10.0.0.1",
      userAgent: "Chrome",
      attempts: 2,
    });
    challenges.create(full);
    expect(challenges.findById("c1")).toEqual(full);
    expect(challenges.findById("nope")).toBeNull();
  });

  test("update changes the resolution but not who asked", () => {
    challenges.create(challenge("c1", { ip: "10.0.0.1" }));

    challenges.update(
      challenge("c1", {
        method: "telegram",
        status: "approved",
        issuedToken: "jwt",
        resolvedAt: NOW,
        attempts: 1,
        ip: "6.6.6.6",
        userAgent: "changed",
        createdAt: 1,
      }),
    );

    expect(challenges.findById("c1")).toEqual(
      challenge("c1", {
        method: "telegram",
        status: "approved",
        issuedToken: "jwt",
        resolvedAt: NOW,
        attempts: 1,
        ip: "10.0.0.1",
      }),
    );
  });

  test("cleanup drops expired challenges and old consumed or denied ones", () => {
    challenges.create(challenge("expired", { expiresAt: NOW - 1 }));
    challenges.create(challenge("pending"));
    challenges.create(
      challenge("consumed-old", {
        status: "consumed",
        resolvedAt: NOW - HOUR - 1,
      }),
    );
    challenges.create(
      challenge("denied-old", { status: "denied", resolvedAt: NOW - 2 * HOUR }),
    );
    challenges.create(
      challenge("consumed-recent", {
        status: "consumed",
        resolvedAt: NOW - 10,
      }),
    );
    challenges.create(
      challenge("approved-old", {
        status: "approved",
        resolvedAt: NOW - 2 * HOUR,
      }),
    );

    challenges.deleteExpired();

    const left = [
      "expired",
      "pending",
      "consumed-old",
      "denied-old",
      "consumed-recent",
      "approved-old",
    ].filter((id) => challenges.findById(id));
    expect(left).toEqual(["pending", "consumed-recent", "approved-old"]);
  });

  test("challenges go away with their user", () => {
    challenges.create(challenge("c1"));
    challenges.delete("nope");
    expect(challenges.findById("c1")?.id).toBe("c1");
    users.delete("alice");
    expect(challenges.findById("c1")).toBeNull();
  });
});
