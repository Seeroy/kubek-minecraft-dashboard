import { describe, expect, test } from "bun:test";
import { createHash } from "crypto";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { digestAlgorithm, hashFile } from "./hashFile";

describe("hashFile", () => {
  test("matches in-memory digests for several algorithms", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kubek-hash-"));
    const file = join(dir, "data.bin");
    const data = Buffer.alloc(3 * 1024 * 1024, 7);
    writeFileSync(file, data);
    try {
      const hashes = await hashFile(file, ["sha1", "sha512"]);
      expect(hashes.sha1).toBe(createHash("sha1").update(data).digest("hex"));
      expect(hashes.sha512).toBe(
        createHash("sha512").update(data).digest("hex"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detects the algorithm by digest length", () => {
    expect(digestAlgorithm("a".repeat(40))).toBe("sha1");
    expect(digestAlgorithm("a".repeat(128))).toBe("sha512");
    expect(digestAlgorithm("abc")).toBeUndefined();
  });
});
