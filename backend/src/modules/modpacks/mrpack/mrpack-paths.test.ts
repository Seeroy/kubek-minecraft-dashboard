import { describe, expect, test } from "bun:test";
import { resolve } from "path";
import {
  allowedDownloads,
  jailPath,
  overrideEntry,
  safeRelativePath,
} from "./mrpack-paths";

describe("safeRelativePath", () => {
  test("normalizes harmless paths", () => {
    expect(safeRelativePath("config/./sodium.json")).toBe("config/sodium.json");
    expect(safeRelativePath("mods/a.jar")).toBe("mods/a.jar");
  });

  test.each([
    "",
    "..",
    "../x",
    "a/../../x",
    "/abs",
    "C:x",
    "a\\b",
    "a\0b",
    ".",
  ])("rejects %p", (path) => {
    expect(() => safeRelativePath(path)).toThrow();
  });
});

describe("jailPath", () => {
  test("resolves inside the base", () => {
    expect(jailPath("/srv/s1", "config/a.toml")).toBe(
      resolve("/srv/s1/config/a.toml"),
    );
  });

  test("never returns the base itself", () => {
    expect(() => jailPath("/srv/s1", "./")).toThrow();
  });
});

describe("allowedDownloads", () => {
  test("keeps https urls on spec hosts", () => {
    expect(
      allowedDownloads([
        "https://cdn.modrinth.com/a.jar",
        "https://raw.githubusercontent.com/a/b/c.jar",
        "https://gitlab.com/a.jar",
        "https://github.com.evil.io/a.jar",
        "ftp://github.com/a.jar",
        "not a url",
        42,
      ]),
    ).toEqual([
      "https://cdn.modrinth.com/a.jar",
      "https://raw.githubusercontent.com/a/b/c.jar",
      "https://gitlab.com/a.jar",
    ]);
  });
});

describe("overrideEntry", () => {
  test("maps both server layers", () => {
    expect(overrideEntry("overrides/config/a.toml")).toEqual({
      layer: "overrides",
      path: "config/a.toml",
    });
    expect(overrideEntry("server-overrides/server.properties")).toEqual({
      layer: "server-overrides",
      path: "server.properties",
    });
  });

  test("ignores client overrides, directories and the index", () => {
    expect(overrideEntry("client-overrides/options.txt")).toBeNull();
    expect(overrideEntry("overrides/config/")).toBeNull();
    expect(overrideEntry("modrinth.index.json")).toBeNull();
  });

  test("rejects traversal inside overrides", () => {
    expect(() => overrideEntry("overrides/../../x")).toThrow();
  });
});
