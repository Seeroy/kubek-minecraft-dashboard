import { describe, expect, test } from "bun:test";
import { readPlayersSettings, supportsPlayerLists } from "./players-support";

const properties = [
  { path: "server.properties", parser: "properties" as const, label: "" },
];

describe("supportsPlayerLists", () => {
  test("java servers with server.properties", () => {
    expect(
      supportsPlayerLists({
        features: ["console", "players"],
        configFiles: properties,
        query: { protocol: "minecraft-java" },
      }),
    ).toBe(true);
  });

  test("not proxies, bedrock or servers without the feature", () => {
    expect(
      supportsPlayerLists({
        features: ["players"],
        configFiles: [{ path: "velocity.toml", parser: "toml", label: "" }],
      }),
    ).toBe(false);
    expect(
      supportsPlayerLists({
        features: ["players"],
        configFiles: properties,
        query: { protocol: "minecraft-bedrock" },
      }),
    ).toBe(false);
    expect(
      supportsPlayerLists({ features: ["console"], configFiles: properties }),
    ).toBe(false);
    expect(supportsPlayerLists(undefined)).toBe(false);
  });
});

describe("readPlayersSettings", () => {
  test("reads the toggles", () => {
    expect(
      readPlayersSettings({
        "white-list": "true",
        "enforce-whitelist": "false",
        "online-mode": "false",
        "op-permission-level": "2",
      }),
    ).toEqual({
      whitelist: true,
      enforceWhitelist: false,
      onlineMode: false,
      opPermissionLevel: 2,
    });
  });

  test("falls back to server defaults", () => {
    expect(readPlayersSettings(null)).toEqual({
      whitelist: false,
      enforceWhitelist: false,
      onlineMode: true,
      opPermissionLevel: 4,
    });
    expect(
      readPlayersSettings({ "op-permission-level": "9" }).opPermissionLevel,
    ).toBe(4);
  });
});
