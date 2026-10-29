import { describe, expect, test } from "bun:test";
import {
  applyChange,
  decodeList,
  formatServerDate,
  isApplied,
  parseServerDate,
  type RawEntry,
} from "./list-codec";

const NOW = Date.UTC(2026, 9, 24, 12, 30, 5);
const steve = { name: "Steve", uuid: "8667ba71-b85a-4004-af54-457a9734eed7" };

describe("server dates", () => {
  test("format in UTC", () => {
    expect(formatServerDate(NOW)).toBe("2026-10-24 12:30:05 +0000");
  });

  test("parse with an offset", () => {
    expect(parseServerDate("2026-10-24 15:30:05 +0300")).toBe(NOW);
    expect(parseServerDate("2026-10-24 12:30:05 +0000")).toBe(NOW);
    expect(parseServerDate("garbage")).toBeNull();
  });
});

describe("decodeList", () => {
  test("skips malformed entries and fills defaults", () => {
    const ops = decodeList("ops", [
      { uuid: steve.uuid, name: "Steve" },
      { uuid: "x" },
      { name: "Alex", level: 2, bypassesPlayerLimit: true },
    ]);
    expect(ops).toEqual([
      { ...steve, level: 4, bypassesPlayerLimit: false },
      { name: "Alex", uuid: "", level: 2, bypassesPlayerLimit: true },
    ]);
  });

  test("reads permanent and temporary bans", () => {
    const bans = decodeList("bans", [
      {
        ...steve,
        created: "2026-10-24 12:30:05 +0000",
        source: "Server",
        expires: "forever",
        reason: "Griefing",
      },
    ]);
    expect(bans[0]).toEqual({
      ...steve,
      reason: "Griefing",
      source: "Server",
      createdAt: NOW,
      expiresAt: null,
    });
    const ips = decodeList("ipBans", [
      { ip: "10.0.0.1", expires: "2026-10-24 12:30:05 +0000" },
    ]);
    expect(ips[0].expiresAt).toBe(NOW);
  });
});

describe("applyChange", () => {
  const raw: RawEntry[] = [
    { uuid: "a", name: "Alex", extra: 1 },
    { uuid: steve.uuid, name: "steve" },
  ];

  test("add replaces an entry with the same name or uuid", () => {
    const next = applyChange(raw, {
      list: "ops",
      action: "add",
      player: steve,
      level: 3,
      bypassesPlayerLimit: false,
    });
    expect(next).toEqual([
      { uuid: "a", name: "Alex", extra: 1 },
      { ...steve, level: 3, bypassesPlayerLimit: false },
    ]);
  });

  test("remove matches names case insensitively", () => {
    expect(
      applyChange(raw, { list: "whitelist", action: "remove", name: "STEVE" }),
    ).toEqual([{ uuid: "a", name: "Alex", extra: 1 }]);
  });

  test("bans carry dates in the server format", () => {
    const [ban] = applyChange(
      [],
      {
        list: "bans",
        action: "add",
        player: steve,
        reason: "Spam",
        source: "admin",
        expiresAt: null,
      },
      NOW,
    );
    expect(ban).toEqual({
      ...steve,
      created: "2026-10-24 12:30:05 +0000",
      source: "admin",
      expires: "forever",
      reason: "Spam",
    });
  });

  test("ip bans are keyed by address", () => {
    const next = applyChange([{ ip: "1.1.1.1" }, { ip: "2.2.2.2" }], {
      list: "ipBans",
      action: "remove",
      ip: "1.1.1.1",
    });
    expect(next).toEqual([{ ip: "2.2.2.2" }]);
  });
});

describe("isApplied", () => {
  test("add needs the entry, remove needs it gone", () => {
    const raw = [{ uuid: steve.uuid, name: "Steve" }];
    expect(
      isApplied(raw, { list: "whitelist", action: "add", player: steve }),
    ).toBe(true);
    expect(
      isApplied(raw, { list: "whitelist", action: "remove", name: "steve" }),
    ).toBe(false);
    expect(
      isApplied([], { list: "whitelist", action: "remove", name: "steve" }),
    ).toBe(true);
  });
});
