import { describe, expect, test } from "bun:test";
import {
  aliasFor,
  freePorts,
  generateSecret,
  maskSecret,
} from "./network-naming";

describe("aliasFor", () => {
  test("turns names into toml keys", () => {
    expect(aliasFor("My Lobby #1", [])).toBe("my-lobby-1");
    expect(aliasFor("Лобби", [])).toBe("server");
  });

  test("avoids taken aliases", () => {
    expect(aliasFor("lobby", ["lobby", "lobby-2"])).toBe("lobby-3");
  });
});

describe("freePorts", () => {
  test("skips used ports", () => {
    expect(freePorts(new Set([25566, 25568]), 3, 25566)).toEqual([
      25567, 25569, 25570,
    ]);
  });

  test("stops at the last port", () => {
    expect(freePorts(new Set(), 3, 65534)).toEqual([65534, 65535]);
  });
});

describe("secrets", () => {
  test("generates alphanumeric secrets", () => {
    expect(generateSecret()).toMatch(/^[A-Za-z0-9]{24}$/);
  });

  test("masks every occurrence", () => {
    expect(maskSecret("secret: 'abc' abc", "abc")).toBe(
      "secret: '********' ********",
    );
    expect(maskSecret("x", "")).toBe("x");
  });
});
