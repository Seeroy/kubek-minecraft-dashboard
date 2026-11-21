import { describe, expect, test } from "bun:test";
import {
  cleanReason,
  commandFor,
  feedCommand,
  gamemodeCommand,
  healCommand,
  kickCommand,
  LegacyCommandError,
  teleportCommand,
} from "./console-commands";

const steve = { name: "Steve", uuid: "" };
const ban = { reason: "", source: "admin", expiresAt: null };

describe("commandFor", () => {
  test("list commands", () => {
    expect(
      commandFor({ list: "whitelist", action: "add", player: steve }),
    ).toBe("whitelist add Steve");
    expect(
      commandFor({ list: "whitelist", action: "remove", name: "Steve" }),
    ).toBe("whitelist remove Steve");
    expect(
      commandFor({
        list: "ops",
        action: "add",
        player: steve,
        level: 4,
        bypassesPlayerLimit: false,
      }),
    ).toBe("op Steve");
    expect(commandFor({ list: "ops", action: "remove", name: "Steve" })).toBe(
      "deop Steve",
    );
    expect(commandFor({ list: "bans", action: "remove", name: "Steve" })).toBe(
      "pardon Steve",
    );
    expect(
      commandFor({ list: "ipBans", action: "remove", ip: "10.0.0.1" }),
    ).toBe("pardon-ip 10.0.0.1");
  });

  test("bans append the reason when there is one", () => {
    expect(
      commandFor({ list: "bans", action: "add", player: steve, ...ban }),
    ).toBe("ban Steve");
    expect(
      commandFor({
        list: "ipBans",
        action: "add",
        ip: "10.0.0.1",
        ...ban,
        reason: "Spam bots",
      }),
    ).toBe("ban-ip 10.0.0.1 Spam bots");
  });
});

describe("cleanReason", () => {
  test("keeps the command on one line", () => {
    expect(cleanReason(" a\nstop\r\n ")).toBe("a stop");
    expect(kickCommand("Steve", "bye\nop Steve")).toBe(
      "kick Steve bye op Steve",
    );
  });

  test("caps the length", () => {
    expect(cleanReason("x".repeat(400))).toHaveLength(256);
  });
});

describe("player actions", () => {
  test("gamemode, heal and feed", () => {
    expect(gamemodeCommand("Steve", "creative")).toBe(
      "gamemode creative Steve",
    );
    expect(healCommand("Steve")).toBe(
      "effect give Steve minecraft:instant_health 1 10 true",
    );
    expect(feedCommand("Steve")).toBe(
      "effect give Steve minecraft:saturation 1 10 true",
    );
  });

  test("teleport in place or to another dimension", () => {
    expect(teleportCommand("Steve", { x: 1.23456, y: 64, z: -0.0000001 })).toBe(
      "tp Steve 1.235 64 0",
    );
    expect(
      teleportCommand("Steve", {
        x: 0,
        y: 70,
        z: 0,
        dimension: "minecraft:the_nether",
      }),
    ).toBe("execute in minecraft:the_nether run tp Steve 0 70 0");
  });

  test("1.8 to 1.12 syntax", () => {
    expect(healCommand("Steve", true)).toBe("effect Steve 6 1 10 true");
    expect(feedCommand("Steve", true)).toBe("effect Steve 23 1 10 true");
    expect(teleportCommand("Steve", { x: 1, y: 2, z: 3 }, true)).toBe(
      "tp Steve 1 2 3",
    );
    expect(() =>
      teleportCommand(
        "Steve",
        { x: 1, y: 2, z: 3, dimension: "minecraft:the_end" },
        true,
      ),
    ).toThrow(LegacyCommandError);
  });
});
