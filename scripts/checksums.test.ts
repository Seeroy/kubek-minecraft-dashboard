import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import {
  formatChecksums,
  parseChecksums,
  sha256File,
  writeChecksums,
} from "./checksums.ts";

const EMPTY_SHA =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("checksums", () => {
  test("format and parse round trip", () => {
    const text = formatChecksums([
      { file: "b", sha256: "1".repeat(64) },
      { file: "a", sha256: "2".repeat(64) },
    ]);
    expect(text).toBe(`${"2".repeat(64)}  a\n${"1".repeat(64)}  b\n`);
    expect(parseChecksums(text).get("b")).toBe("1".repeat(64));
  });

  test("parse accepts binary markers and CRLF, skips junk", () => {
    const sums = parseChecksums(
      `${"A".repeat(64)} *Kubek-4.1.0-win-x64.exe\r\nnot a line\n`,
    );
    expect(sums.size).toBe(1);
    expect(sums.get("Kubek-4.1.0-win-x64.exe")).toBe("a".repeat(64));
  });

  test("writes sums for one version only", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kubek-sums-"));
    try {
      writeFileSync(path.join(dir, "Kubek-4.1.0-linux-x64"), "");
      writeFileSync(path.join(dir, "Kubek-4.0.2-linux-x64"), "old");
      writeFileSync(path.join(dir, "Kubek-4.1.0-native"), "docker only");
      const file = writeChecksums(dir, "4.1.0");
      expect(readFileSync(file, "utf8")).toBe(
        `${EMPTY_SHA}  Kubek-4.1.0-linux-x64\n`,
      );
      expect(sha256File(path.join(dir, "Kubek-4.1.0-linux-x64"))).toBe(
        EMPTY_SHA,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
