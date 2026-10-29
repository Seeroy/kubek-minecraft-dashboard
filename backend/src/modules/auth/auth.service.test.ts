import { beforeEach, describe, expect, test } from "bun:test";
import * as bcrypt from "bcryptjs";
import { testUser } from "@/testing/user";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { sqliteProvider } from "@/testing/sqlite";
import { AuthService } from "./auth.service";

let users: UsersRepository;
let auth: AuthService;

beforeEach(() => {
  users = new UsersRepository(sqliteProvider());
  users.create(
    testUser("alice", { password: bcrypt.hashSync("correct horse", 4) }),
  );
  auth = new AuthService(new AccountsService(users));
});

describe("AuthService", () => {
  test("correct password returns the account", async () => {
    const user = await auth.validateUser("alice", "correct horse");

    expect(user?.id).toBe("alice");
  });

  test("wrong password returns null", async () => {
    expect(await auth.validateUser("alice", "correct horse ")).toBeNull();
    expect(await auth.validateUser("alice", "")).toBeNull();
  });

  test("unknown username returns null", async () => {
    expect(await auth.validateUser("mallory", "correct horse")).toBeNull();
  });

  test("password hash itself is not accepted as the password", async () => {
    const hash = users.findById("alice")!.password;

    expect(await auth.validateUser("alice", hash)).toBeNull();
  });

  test("completing onboarding is persisted", () => {
    auth.completeOOBE(users.findById("alice")!);

    expect(users.findById("alice")?.oobeCompleted).toBe(true);
  });

  test("completing onboarding keeps the rest of the account", () => {
    const before = users.findById("alice")!;

    auth.completeOOBE(before);

    expect(users.findById("alice")).toEqual({ ...before, oobeCompleted: true });
  });
});
