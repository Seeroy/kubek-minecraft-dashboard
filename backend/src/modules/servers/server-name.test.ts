import { describe, expect, test } from "bun:test";
import { BadRequestException } from "@nestjs/common";
import { assertServerName } from "./server-name";

describe("assertServerName", () => {
  test("trims and keeps normal names, unicode included", () => {
    expect(assertServerName("  Lobby #1 (main)  ")).toBe("Lobby #1 (main)");
    expect(assertServerName("Выживание")).toBe("Выживание");
  });

  test("refuses empty, too long and non string names", () => {
    for (const bad of ["", "   ", "x".repeat(65), undefined, 42]) {
      expect(() => assertServerName(bad)).toThrow(BadRequestException);
    }
  });

  test("refuses what could add lines to a config file", () => {
    for (const bad of ["a\nenable-rcon=true", "a\rb", "a\\b", "a\u2028b", "a\u0000b"]) {
      expect(() => assertServerName(bad)).toThrow(
        "Server name contains forbidden characters",
      );
    }
  });
});
