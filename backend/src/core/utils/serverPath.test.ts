import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { BadRequestException } from "@nestjs/common";
import fs from "fs";
import os from "os";
import path, { resolve, sep } from "path";
import {
  assertSafeFileName,
  getRealServerFileSync,
  getRealServerPath,
  getSafeServerPath,
  getServerContentPath,
} from "./serverPath";

describe("assertSafeFileName", () => {
  test("accepts plain jar names", () => {
    expect(assertSafeFileName("sodium-0.6.0+mc1.21.jar")).toBe(
      "sodium-0.6.0+mc1.21.jar",
    );
  });

  test.each(["", ".", "..", "../evil.jar", "a/b.jar", "a\\b.jar", "C:x.jar"])(
    "rejects %p",
    (name) => {
      expect(() => assertSafeFileName(name)).toThrow();
    },
  );
});

describe("getServerContentPath", () => {
  test("stays inside the server folder", () => {
    const path = getServerContentPath("abc", "mods", "lithium.jar");
    expect(path).toBe(resolve("./servers/abc/mods/lithium.jar"));
    expect(path.startsWith(resolve("./servers/abc") + sep)).toBe(true);
  });

  test("rejects traversal through the file name", () => {
    expect(() => getServerContentPath("abc", "mods", "../../x.jar")).toThrow();
  });
});

describe("getSafeServerPath", () => {
  const base = resolve("./servers/abc");

  test("returns the server folder and paths below it", () => {
    expect(getSafeServerPath("abc")).toBe(base);
    expect(getSafeServerPath("abc", "world/level.dat")).toBe(
      resolve(base, "world/level.dat"),
    );
    expect(getSafeServerPath("abc", "/logs/latest.log")).toBe(
      resolve(base, "logs/latest.log"),
    );
  });

  test.each(["", "../abc", "a/b", "a\\b", ".."])(
    "rejects server id %p",
    (id) => {
      expect(() => getSafeServerPath(id)).toThrow("Invalid server id");
    },
  );

  test.each(["..", "../other", "world/../../other", "../abc-evil/x"])(
    "rejects traversal %p",
    (rel) => {
      expect(() => getSafeServerPath("abc", rel)).toThrow(
        "directory traversal",
      );
    },
  );
});

describe("real server paths", () => {
  let cwd: string;
  let root: string;
  let server: string;

  beforeEach(() => {
    cwd = process.cwd();
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "kubek-path-")),
    );
    process.chdir(root);
    server = path.join(root, "servers", "abc");
    fs.mkdirSync(path.join(server, "world"), { recursive: true });
    fs.writeFileSync(path.join(root, "db.sql"), "secret");
    fs.writeFileSync(path.join(server, "world", "level.dat"), "level");
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("plain and missing paths inside the server pass", async () => {
    expect(await getRealServerPath("abc", "world/level.dat")).toBe(
      path.join(server, "world", "level.dat"),
    );
    expect(await getRealServerPath("abc", "new/dir/file.txt")).toBe(
      path.join(server, "new", "dir", "file.txt"),
    );
  });

  test("a server folder that doesn't exist yet passes", async () => {
    expect(await getRealServerPath("fresh", "a.txt")).toBe(
      path.join(root, "servers", "fresh", "a.txt"),
    );
  });

  test("a file link out of the server is refused", async () => {
    fs.symlinkSync(path.join(root, "db.sql"), path.join(server, "icon.png"));
    await expect(getRealServerPath("abc", "icon.png")).rejects.toThrow(
      BadRequestException,
    );
    expect(() => getRealServerFileSync("abc", "icon.png")).toThrow(
      BadRequestException,
    );
  });

  test("a linked parent folder is refused, also below it for missing paths", async () => {
    fs.symlinkSync(root, path.join(server, "linked"));
    await expect(getRealServerPath("abc", "linked/db.sql")).rejects.toThrow(
      BadRequestException,
    );
    await expect(getRealServerPath("abc", "linked/new.txt")).rejects.toThrow(
      BadRequestException,
    );
  });

  test("a dangling link is refused, writing through it would create the target", async () => {
    fs.symlinkSync(path.join(root, "made.txt"), path.join(server, "a.txt"));
    await expect(getRealServerPath("abc", "a.txt")).rejects.toThrow(
      BadRequestException,
    );
  });

  test("a link inside the server resolves to its target", () => {
    fs.symlinkSync(
      path.join(server, "world", "level.dat"),
      path.join(server, "copy.dat"),
    );
    expect(getRealServerFileSync("abc", "copy.dat")).toBe(
      path.join(server, "world", "level.dat"),
    );
    expect(getRealServerFileSync("abc", "missing.dat")).toBeNull();
  });
});
