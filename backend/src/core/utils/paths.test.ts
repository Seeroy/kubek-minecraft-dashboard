import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { isInside, isRealInside } from "./paths";

describe("isInside", () => {
  test("accepts the base and anything below it", () => {
    expect(isInside("/srv/a", "/srv/a")).toBe(true);
    expect(isInside("/srv/a", "/srv/a/b/c.txt")).toBe(true);
    expect(isInside("/srv/a/", "/srv/a/b")).toBe(true);
    expect(isInside("/srv/a", "/srv/a/..foo")).toBe(true);
  });

  test("rejects parents, siblings and prefix lookalikes", () => {
    expect(isInside("/srv/a", "/srv")).toBe(false);
    expect(isInside("/srv/a", "/srv/ab")).toBe(false);
    expect(isInside("/srv/a", "/srv/a/../b")).toBe(false);
    expect(isInside("/srv/a", "/etc/passwd")).toBe(false);
  });

  test("resolves relative paths against cwd", () => {
    expect(isInside("./servers/x", "./servers/x/world")).toBe(true);
    expect(isInside("./servers/x", "./servers/y")).toBe(false);
  });
});

describe("isRealInside", () => {
  let root: string;
  let base: string;
  let outside: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "kubek-paths-"));
    base = join(root, "server");
    outside = join(root, "outside");
    mkdirSync(join(base, "world"), { recursive: true });
    mkdirSync(outside);
    writeFileSync(join(base, "world", "level.dat"), "x");
    writeFileSync(join(outside, "secret.txt"), "s");
    symlinkSync(outside, join(base, "escape"));
    symlinkSync(join(outside, "secret.txt"), join(base, "secret-link"));
    symlinkSync(join(base, "world"), join(base, "world-link"));
    symlinkSync(join(root, "missing"), join(base, "dangling"));
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  test("accepts real entries and links that stay inside", async () => {
    expect(await isRealInside(base, join(base, "world", "level.dat"))).toBe(
      true,
    );
    expect(await isRealInside(base, join(base, "world-link"))).toBe(true);
  });

  test("rejects links that point outside", async () => {
    expect(await isRealInside(base, join(base, "secret-link"))).toBe(false);
    expect(await isRealInside(base, join(base, "escape", "secret.txt"))).toBe(
      false,
    );
  });

  test("missing paths need allowMissing and an inside ancestor", async () => {
    const fresh = join(base, "world", "new", "file.txt");
    expect(await isRealInside(base, fresh)).toBe(false);
    expect(await isRealInside(base, fresh, true)).toBe(true);
    expect(await isRealInside(base, join(base, "escape", "new"), true)).toBe(
      false,
    );
  });

  test("dangling links never pass", async () => {
    expect(await isRealInside(base, join(base, "dangling"), true)).toBe(false);
    expect(await isRealInside(base, join(base, "dangling", "x"), true)).toBe(
      false,
    );
  });

  test("a missing base fails", async () => {
    expect(await isRealInside(join(root, "nope"), join(root, "nope"))).toBe(
      false,
    );
  });
});
