import { describe, expect, test } from "bun:test";
import { readPlayerNbt, readPlayerStats, readUserCache } from "./player-data";

describe("readPlayerNbt", () => {
  test("modern save", () => {
    const save = readPlayerNbt({
      playerGameType: 2,
      Health: 13.5,
      foodLevel: 18,
      XpLevel: 30,
      Dimension: "minecraft:the_end",
      Pos: [100.123, 64, -5.5],
      LastDeathLocation: {
        dimension: "minecraft:overworld",
        pos: Int32Array.from([1, 2, 3]),
      },
    });
    expect(save).toEqual({
      gamemode: "adventure",
      health: 13.5,
      food: 18,
      xpLevel: 30,
      position: { dimension: "minecraft:the_end", x: 100.12, y: 64, z: -5.5 },
      lastDeath: { dimension: "minecraft:overworld", x: 1, y: 2, z: 3 },
    });
  });

  test("numeric dimensions from old versions", () => {
    expect(
      readPlayerNbt({ Dimension: -1, Pos: [0, 0, 0] }).position?.dimension,
    ).toBe("minecraft:the_nether");
  });

  test("missing and odd fields are null", () => {
    expect(
      readPlayerNbt({ playerGameType: 9, Pos: [1, Number.NaN, 2] }),
    ).toEqual({
      gamemode: null,
      health: null,
      food: null,
      xpLevel: null,
      position: null,
      lastDeath: null,
    });
  });
});

describe("readPlayerStats", () => {
  test("1.13+ layout", () => {
    expect(
      readPlayerStats({
        stats: {
          "minecraft:custom": {
            "minecraft:play_time": 72000,
            "minecraft:deaths": 3,
            "minecraft:mob_kills": 40,
            "minecraft:walk_one_cm": 1000,
            "minecraft:sprint_one_cm": 500,
            "minecraft:fall_one_cm": 9999,
            "minecraft:jump": 12,
          },
        },
      }),
    ).toEqual({
      playTimeTicks: 72000,
      deaths: 3,
      mobKills: 40,
      playerKills: 0,
      distanceCm: 1500,
      jumps: 12,
    });
  });

  test("play_one_minute before it was renamed", () => {
    expect(
      readPlayerStats({
        stats: { "minecraft:custom": { "minecraft:play_one_minute": 20 } },
      })?.playTimeTicks,
    ).toBe(20);
  });

  test("flat layout before 1.13", () => {
    expect(
      readPlayerStats({
        "stat.playOneMinute": 40,
        "stat.deaths": 1,
        "stat.walkOneCm": 300,
        "stat.fallOneCm": 50,
      }),
    ).toEqual({
      playTimeTicks: 40,
      deaths: 1,
      mobKills: 0,
      playerKills: 0,
      distanceCm: 300,
      jumps: 0,
    });
  });

  test("nothing useful", () => {
    expect(readPlayerStats(null)).toBeNull();
    expect(readPlayerStats({ DataVersion: 3000 })).toBeNull();
  });
});

describe("readUserCache", () => {
  test("keeps valid entries and lowercases uuids", () => {
    expect(
      readUserCache([
        {
          name: "Steve",
          uuid: "8667BA71-B85A-4004-AF54-457A9734EED7",
          expiresOn: "2026-12-01",
        },
        { name: "Broken" },
        null,
        { name: "Bad", uuid: "../../etc" },
      ]),
    ).toEqual([
      { name: "Steve", uuid: "8667ba71-b85a-4004-af54-457a9734eed7" },
    ]);
  });

  test("not an array", () => {
    expect(readUserCache({})).toEqual([]);
  });
});
