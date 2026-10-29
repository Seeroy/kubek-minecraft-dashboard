import { describe, expect, test } from "bun:test";
import { createExclusionMatcher } from "./exclusions";

describe("createExclusionMatcher", () => {
  test("no patterns excludes nothing", () => {
    expect(createExclusionMatcher([])("world/level.dat")).toBe(false);
  });

  test("a name pattern matches at any depth", () => {
    const excluded = createExclusionMatcher(["*.log"]);
    expect(excluded("latest.log")).toBe(true);
    expect(excluded("logs/2026-10-24.log")).toBe(true);
    expect(excluded("server.properties")).toBe(false);
  });

  test("a folder name excludes everything inside", () => {
    const excluded = createExclusionMatcher(["cache"]);
    expect(excluded("cache/a/b.bin")).toBe(true);
    expect(excluded("plugins/cache/x")).toBe(true);
    expect(excluded("cached.txt")).toBe(false);
  });

  test("a path pattern is anchored to the server root", () => {
    const excluded = createExclusionMatcher(["plugins/dynmap/**"]);
    expect(excluded("plugins/dynmap/web/tiles/1.png")).toBe(true);
    expect(excluded("other/plugins/dynmap/x")).toBe(false);
  });

  test("trailing slash and leading ./ are ignored", () => {
    const excluded = createExclusionMatcher(["./temp/"]);
    expect(excluded("temp/file")).toBe(true);
  });
});
