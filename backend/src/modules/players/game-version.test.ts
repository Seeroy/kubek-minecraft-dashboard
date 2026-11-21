import { describe, expect, test } from "bun:test";
import {
  parseGameVersion,
  usesLegacyCommands,
} from "@shared/players/game-version";

describe("parseGameVersion", () => {
  test.each([
    ["1.21.4", [1, 21]],
    ["Paper 1.20.1", [1, 20]],
    ["Spigot 1.8.8", [1, 8]],
    ["26.1", [26, 1]],
    ["Requires MC 1.12.2", [1, 12]],
  ])("%p", (text, expected) => {
    expect(parseGameVersion(text)).toEqual(expected as [number, number]);
  });

  test("nothing to parse", () => {
    expect(parseGameVersion(undefined)).toBeNull();
    expect(parseGameVersion("Velocity")).toBeNull();
  });
});

describe("usesLegacyCommands", () => {
  test("before 1.13 only", () => {
    expect(usesLegacyCommands("1.12.2")).toBe(true);
    expect(usesLegacyCommands("Paper 1.8.8")).toBe(true);
    expect(usesLegacyCommands("1.13")).toBe(false);
    expect(usesLegacyCommands("26.1")).toBe(false);
    expect(usesLegacyCommands(undefined)).toBe(false);
  });
});
