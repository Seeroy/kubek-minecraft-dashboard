import { describe, expect, test } from "bun:test";
import { ServerLocksService } from "./server-locks.service";

describe("ServerLocksService", () => {
  test("a second operation on the same server is refused", () => {
    const locks = new ServerLocksService();
    locks.acquire("s1", "backup");
    expect(() => locks.acquire("s1", "restore")).toThrow();
    expect(locks.holder("s1")).toBe("backup");
  });

  test("other servers are independent and release frees the lock", () => {
    const locks = new ServerLocksService();
    const release = locks.acquire("s1", "restore");
    expect(() => locks.acquire("s2", "backup")).not.toThrow();
    release();
    release();
    expect(locks.holder("s1")).toBeNull();
    expect(() => locks.acquire("s1", "backup")).not.toThrow();
  });
});
