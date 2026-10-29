import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { downloadVerified, type FetchLike } from "./mrpack-download";
import type { MrpackFile } from "./mrpack-reader";

const dir = mkdtempSync(join(tmpdir(), "kubek-mrpack-dl-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const body = Buffer.from("fabric mod bytes ".repeat(4096));
const digest = (algorithm: string) =>
  createHash(algorithm).update(body).digest("hex");

function packFile(overrides: Partial<MrpackFile> = {}): MrpackFile {
  return {
    path: "mods/a.jar",
    sha1: digest("sha1"),
    sha512: digest("sha512"),
    size: body.length,
    downloads: ["https://cdn.modrinth.com/a.jar"],
    ...overrides,
  };
}

const serving =
  (responses: Record<string, Response | (() => Response)>): FetchLike =>
  (url) => {
    const entry = responses[url];
    const res = typeof entry === "function" ? entry() : entry;
    return Promise.resolve(res ?? new Response(null, { status: 404 }));
  };

describe("downloadVerified", () => {
  test("writes the file when both hashes match", async () => {
    const dest = join(dir, "ok", "a.jar");
    let bytes = 0;
    await downloadVerified(
      packFile(),
      dest,
      (n) => (bytes += n),
      serving({ "https://cdn.modrinth.com/a.jar": new Response(body) }),
    );
    expect(readFileSync(dest).equals(body)).toBe(true);
    expect(bytes).toBe(body.length);
  });

  test("rejects a hash mismatch and leaves nothing behind", async () => {
    const dest = join(dir, "bad", "a.jar");
    let bytes = 0;
    const result = await downloadVerified(
      packFile({ sha1: "0".repeat(40) }),
      dest,
      (n) => (bytes += n),
      serving({ "https://cdn.modrinth.com/a.jar": new Response(body) }),
    ).then(
      () => "ok",
      (error: Error) => error.message,
    );
    expect(result).toContain("Integrity check failed");
    expect(existsSync(dest)).toBe(false);
    expect(existsSync(`${dest}.part`)).toBe(false);
    expect(bytes).toBe(0);
  });

  test("falls back to the next mirror", async () => {
    const dest = join(dir, "mirror", "a.jar");
    await downloadVerified(
      packFile({
        downloads: [
          "https://cdn.modrinth.com/a.jar",
          "https://github.com/o/r/a.jar",
        ],
      }),
      dest,
      undefined,
      serving({
        "https://cdn.modrinth.com/a.jar": new Response(null, { status: 500 }),
        "https://github.com/o/r/a.jar": new Response(body),
      }),
    );
    expect(existsSync(dest)).toBe(true);
  });

  test("aborts files far larger than declared", async () => {
    const dest = join(dir, "big", "a.jar");
    const huge = Buffer.alloc(3 * 1024 * 1024);
    const result = await downloadVerified(
      packFile({ size: 10 }),
      dest,
      undefined,
      serving({ "https://cdn.modrinth.com/a.jar": new Response(huge) }),
    ).then(
      () => "ok",
      (error: Error) => error.message,
    );
    expect(result).toContain("larger than the pack declares");
  });
});
