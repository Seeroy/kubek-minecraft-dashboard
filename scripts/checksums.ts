import { createHash } from "crypto";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import path from "path";

export const CHECKSUMS_FILE = "SHA256SUMS";

/** sha256sum style lines, sorted by name */
export function formatChecksums(entries: { file: string; sha256: string }[]) {
  return (
    [...entries]
      .sort((a, b) => a.file.localeCompare(b.file))
      .map((e) => `${e.sha256}  ${e.file}`)
      .join("\n") + "\n"
  );
}

/** Parse sha256sum output, binary mode too */
export function parseChecksums(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^([0-9a-fA-F]{64}) [ *](.+)$/.exec(line.trim());
    if (match) out.set(match[2]!, match[1]!.toLowerCase());
  }
  return out;
}

export function sha256File(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/**
 * Write SHA256SUMS next to the binaries of a version, lists every binary
 * of it in the folder so separate platform builds add up
 */
export function writeChecksums(dir: string, version: string): string {
  const prefix = `Kubek-${version}-`;
  const files = readdirSync(dir).filter(
    (name) => name.startsWith(prefix) && !name.endsWith("-native"),
  );
  const target = path.join(dir, CHECKSUMS_FILE);
  writeFileSync(
    target,
    formatChecksums(
      files.map((file) => ({
        file,
        sha256: sha256File(path.join(dir, file)),
      })),
    ),
  );
  return target;
}
