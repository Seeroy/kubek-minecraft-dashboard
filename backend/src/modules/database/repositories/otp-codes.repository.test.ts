import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { testUser } from "@/testing/user";
import type { IOtpCode } from "@/modules/telegram-bot/telegram.types";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import type { IUser } from "@shared/types/user.types";
import { OtpCodesRepository } from "./otp-codes.repository";
import { UsersRepository } from "./users.repository";

let codes: OtpCodesRepository;
let users: UsersRepository;

const user = (id: string): IUser => testUser(id);

const code = (id: string, extra: Partial<IOtpCode> = {}): IOtpCode => ({
  id,
  userId: "alice",
  codeHash: `hash-${id}`,
  createdAt: 900,
  expiresAt: 2000,
  used: false,
  ...extra,
});

beforeEach(() => {
  setSystemTime(new Date(1000));
  const provider = sqliteProvider(memoryDatabase());
  codes = new OtpCodesRepository(provider);
  users = new UsersRepository(provider);
  users.create(user("alice"));
  users.create(user("bob"));
});

afterEach(() => {
  setSystemTime();
});

describe("OtpCodesRepository", () => {
  test("a code reads back with its used flag", () => {
    codes.create(code("c1", { used: true }));
    expect(codes.findById("c1")).toEqual(code("c1", { used: true }));
    expect(codes.findById("nope")).toBeNull();
  });

  test("the valid code is the newest unused one that has not expired", () => {
    codes.create(code("old", { createdAt: 100 }));
    codes.create(code("newest-used", { createdAt: 300, used: true }));
    codes.create(code("newest-expired", { createdAt: 400, expiresAt: 999 }));
    codes.create(code("good", { createdAt: 200 }));
    codes.create(code("bobs", { userId: "bob", createdAt: 500 }));

    expect(codes.findValidByUserId("alice")?.id).toBe("good");
  });

  test("a used code is no longer valid", () => {
    codes.create(code("c1"));
    codes.markAsUsed("c1");
    expect(codes.findById("c1")?.used).toBe(true);
    expect(codes.findValidByUserId("alice")).toBeNull();
  });

  test("codes of a user come newest first", () => {
    codes.create(code("a", { createdAt: 1 }));
    codes.create(code("c", { createdAt: 3 }));
    codes.create(code("b", { createdAt: 2 }));
    codes.create(code("bobs", { userId: "bob" }));
    expect(codes.findByUserId("alice").map((c) => c.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(codes.findAll()).toHaveLength(4);
  });

  test("deleteExpired drops codes that ran out before now", () => {
    codes.create(code("past", { expiresAt: 999 }));
    codes.create(code("edge", { expiresAt: 1000 }));
    codes.create(code("future", { expiresAt: 1001 }));

    codes.deleteExpired();

    expect(
      codes
        .findAll()
        .map((c) => c.id)
        .sort(),
    ).toEqual(["edge", "future"]);
  });

  test("delete removes one code and user removal drops the rest", () => {
    codes.create(code("a"));
    codes.create(code("b"));
    codes.delete("a");
    expect(codes.findByUserId("alice").map((c) => c.id)).toEqual(["b"]);

    users.delete("alice");
    expect(codes.findAll()).toEqual([]);
  });
});
