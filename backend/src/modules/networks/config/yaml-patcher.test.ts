import { describe, expect, test } from "bun:test";
import { readYamlValue, setYamlValues } from "./yaml-patcher";

const PAPER_GLOBAL = [
  "# This is the global configuration file for Paper.",
  "# ",
  "# File Reference: https://docs.papermc.io/paper/reference/global-configuration/",
  "",
  "_version: 31",
  "messages:",
  "  no-permission: <red>I'm sorry, but you do not have permission to perform this command.",
  "    Please contact the server administrators if you believe that this is in error.",
  "proxies:",
  "  bungee-cord:",
  "    online-mode: true",
  "  proxy-protocol: false",
  "  velocity:",
  "    enabled: false",
  "    online-mode: true",
  "    secret: ''",
  "scoreboards:",
  "  dont-obfuscate:",
  "  - minecraft:lodestone_tracker",
  "",
].join("\n");

const VELOCITY = ["proxies", "velocity"];

describe("setYamlValues", () => {
  test("changes only the touched values", () => {
    const out = setYamlValues(PAPER_GLOBAL, [
      [[...VELOCITY, "enabled"], true],
      [[...VELOCITY, "secret"], "it's secret"],
    ]);
    const before = PAPER_GLOBAL.split("\n");
    const changed = out.split("\n").filter((line, i) => line !== before[i]);
    expect(changed).toEqual([
      "    enabled: true",
      "    secret: 'it''s secret'",
    ]);
    expect(readYamlValue(out, [...VELOCITY, "secret"])).toBe("it's secret");
  });

  test("leaves the text alone when nothing changes", () => {
    expect(
      setYamlValues(PAPER_GLOBAL, [[[...VELOCITY, "online-mode"], true]]),
    ).toBe(PAPER_GLOBAL);
  });

  test("adds missing keys", () => {
    const out = setYamlValues("settings:\n  debug: false\n", [
      [["settings", "bungeecord"], true],
    ]);
    expect(readYamlValue(out, ["settings", "bungeecord"])).toBe(true);
    expect(readYamlValue(out, ["settings", "debug"])).toBe(false);
  });

  test("builds a file from nothing", () => {
    const out = setYamlValues(null, [
      [[...VELOCITY, "enabled"], true],
      [[...VELOCITY, "secret"], "abc"],
    ]);
    expect(out).toBe(
      "proxies:\n  velocity:\n    enabled: true\n    secret: abc\n",
    );
  });

  test("refuses a broken file instead of overwriting it", () => {
    expect(() => setYamlValues("a: [\n", [[["a"], 1]])).toThrow();
  });
});
