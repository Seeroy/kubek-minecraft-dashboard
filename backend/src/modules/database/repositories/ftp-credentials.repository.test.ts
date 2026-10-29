import { beforeEach, describe, expect, test } from "bun:test";
import { testUser } from "@/testing/user";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import { FtpCredentialsRepository } from "./ftp-credentials.repository";
import { UsersRepository } from "./users.repository";

let ftp: FtpCredentialsRepository;
let users: UsersRepository;

beforeEach(() => {
  const provider = sqliteProvider(memoryDatabase());
  ftp = new FtpCredentialsRepository(provider);
  users = new UsersRepository(provider);
  users.create(testUser("alice"));
});

describe("FtpCredentialsRepository", () => {
  test("setting a password again replaces it", () => {
    ftp.set("alice", "first", 100);
    ftp.set("alice", "second", 200);
    expect(ftp.findByUserId("alice")).toEqual({
      userId: "alice",
      password: "second",
      createdAt: 200,
    });
  });

  test("delete reports whether there was a password", () => {
    ftp.set("alice", "pw", 100);
    expect(ftp.delete("alice")).toBe(true);
    expect(ftp.delete("alice")).toBe(false);
    expect(ftp.findByUserId("alice")).toBeNull();
  });

  test("a password needs an existing user and goes away with it", () => {
    expect(() => ftp.set("ghost", "pw", 1)).toThrow(
      "FOREIGN KEY constraint failed",
    );
    ftp.set("alice", "pw", 1);
    users.delete("alice");
    expect(ftp.findByUserId("alice")).toBeNull();
  });
});
