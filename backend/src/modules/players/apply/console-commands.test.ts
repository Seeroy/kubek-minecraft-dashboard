import { describe, expect, test } from "bun:test";
import { cleanReason, commandFor, kickCommand } from "./console-commands";

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
