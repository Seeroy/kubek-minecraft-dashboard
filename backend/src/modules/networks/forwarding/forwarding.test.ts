import { describe, expect, test } from "bun:test";
import { readYamlValue } from "../config/yaml-patcher";
import { isBefore, type ServerFiles } from "./backend-forwarding";
import { FABRIC_PROXY_CONFIG, FabricForwarding } from "./fabric.forwarding";
import { commonMode, forwardingFor } from "./forwarding-registry";
import {
  PAPER_GLOBAL,
  PAPER_LEGACY,
  PaperForwarding,
  SPIGOT_CONFIG,
} from "./paper.forwarding";
import { SpigotForwarding } from "./spigot.forwarding";

const files = (map: Record<string, string>): ServerFiles => ({
  read: (path) => Promise.resolve(map[path] ?? null),
});

const PAPER_GLOBAL_TEXT =
  "_version: 31\nproxies:\n  velocity:\n    enabled: false\n    online-mode: true\n    secret: ''\n";
const SPIGOT_TEXT = "settings:\n  debug: false\n  bungeecord: false\n";

describe("isBefore", () => {
  test("compares releases", () => {
    expect(isBefore("1.18.2", "1.19")).toBe(true);
    expect(isBefore("1.19", "1.19")).toBe(false);
    expect(isBefore("1.21.4", "1.19")).toBe(false);
    expect(isBefore("26.1", "1.19")).toBe(false);
  });

  test("treats unknown versions as new", () => {
    expect(isBefore(undefined, "1.19")).toBe(false);
    expect(isBefore("25w14a", "1.19")).toBe(false);
  });
});

describe("paper", () => {
  const paper = new PaperForwarding();

  test("modern edits only the velocity section", async () => {
    const edits = await paper.edits(
      files({
        [PAPER_GLOBAL]: PAPER_GLOBAL_TEXT,
        [SPIGOT_CONFIG]: SPIGOT_TEXT,
      }),
      {
        mode: "modern",
        secret: "s3cret",
        gameVersion: "1.21.4",
      },
    );
    expect(edits.map((e) => e.path)).toEqual([PAPER_GLOBAL]);
    expect(edits[0].after).toBe(
      PAPER_GLOBAL_TEXT.replace("enabled: false", "enabled: true").replace(
        "''",
        "'s3cret'",
      ),
    );
  });

  test("old versions use paper.yml", async () => {
    const edits = await paper.edits(files({}), {
      mode: "modern",
      secret: "x",
      gameVersion: "1.16.5",
    });
    expect(edits[0].path).toBe(PAPER_LEGACY);
    expect(
      readYamlValue(edits[0].after, [
        "settings",
        "velocity-support",
        "enabled",
      ]),
    ).toBe(true);
  });

  test("legacy turns bungeecord on and velocity off", async () => {
    const edits = await paper.edits(
      files({
        [PAPER_GLOBAL]: PAPER_GLOBAL_TEXT.replace(
          "enabled: false",
          "enabled: true",
        ),
        [SPIGOT_CONFIG]: SPIGOT_TEXT,
      }),
      {
        mode: "legacy",
        secret: "x",
      },
    );
    const spigot = edits.find((e) => e.path === SPIGOT_CONFIG)!;
    expect(readYamlValue(spigot.after, ["settings", "bungeecord"])).toBe(true);
    const global = edits.find((e) => e.path === PAPER_GLOBAL)!;
    expect(
      readYamlValue(global.after, ["proxies", "velocity", "enabled"]),
    ).toBe(false);
  });

  test("legacy on a fresh server writes no paper config", async () => {
    const edits = await paper.edits(files({}), { mode: "legacy", secret: "x" });
    expect(edits.map((e) => e.path)).toEqual([SPIGOT_CONFIG]);
  });

  test("before 1.13 only legacy works", () => {
    expect(paper.modes("1.12.2")).toEqual(["legacy"]);
    expect(paper.modes("1.20.1")).toEqual(["modern", "legacy"]);
  });
});

describe("spigot", () => {
  test("enables bungeecord", async () => {
    const edits = await new SpigotForwarding().edits(
      files({ [SPIGOT_CONFIG]: SPIGOT_TEXT }),
    );
    expect(edits[0].after).toBe(
      SPIGOT_TEXT.replace("bungeecord: false", "bungeecord: true"),
    );
  });
});

describe("fabric", () => {
  const fabric = new FabricForwarding();

  test("writes a default config with the secret", async () => {
    const [edit] = await fabric.edits(files({}), {
      mode: "modern",
      secret: "abc",
    });
    expect(edit.path).toBe(FABRIC_PROXY_CONFIG);
    expect(edit.before).toBeNull();
    expect((Bun.TOML.parse(edit.after) as { secret: string }).secret).toBe(
      "abc",
    );
  });

  test("keeps the rest of an existing config", async () => {
    const text = 'hackOnlineMode = false\nsecret = "old"\n';
    const [edit] = await fabric.edits(files({ [FABRIC_PROXY_CONFIG]: text }), {
      mode: "modern",
      secret: "new",
    });
    expect(edit.after).toBe('hackOnlineMode = false\nsecret = "new"\n');
  });

  test("no edit when the secret already matches", async () => {
    const text = 'secret = "same"\n';
    expect(
      await fabric.edits(files({ [FABRIC_PROXY_CONFIG]: text }), {
        mode: "modern",
        secret: "same",
      }),
    ).toEqual([]);
  });
});

describe("commonMode", () => {
  test("prefers modern", () => {
    expect(commonMode([["modern", "legacy"], ["modern"]])).toBe("modern");
  });

  test("falls back to legacy for spigot", () => {
    expect(commonMode([["modern", "legacy"], ["legacy"]])).toBe("legacy");
  });

  test("fabric and spigot cannot share a network", () => {
    expect(commonMode([["modern"], ["legacy"]])).toBeNull();
  });

  test("honours an explicit mode only when it fits", () => {
    expect(commonMode([["modern", "legacy"]], "legacy")).toBe("legacy");
    expect(commonMode([["modern"]], "legacy")).toBeNull();
  });

  test("knows the bundled backends", () => {
    expect(forwardingFor("com.kubek.purpur")?.kind).toBe("paper");
    expect(forwardingFor("com.kubek.vanilla")).toBeUndefined();
  });
});
