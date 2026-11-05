import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { deflateRawSync } from "zlib";
import { readZipEntry } from "./zip-entry";

const dir = mkdtempSync(join(tmpdir(), "kubek-zip-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// Smallest valid zip: local headers, central directory and the end record
function zip(
  entries: { name: string; data: string; deflate?: boolean }[],
): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name);
    const plain = Buffer.from(e.data);
    const body = e.deflate ? deflateRawSync(plain) : plain;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(e.deflate ? 8 : 0, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(plain.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(e.deflate ? 8 : 0, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(plain.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += 30 + name.length + body.length;
  }
  const dirBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dirBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dirBuf, end]);
}

function write(name: string, data: Buffer): string {
  const path = join(dir, name);
  writeFileSync(path, data);
  return path;
}

describe("readZipEntry", () => {
  const jar = write(
    "plugin.jar",
    zip([
      { name: "a/B.class", data: "Êþ" },
      {
        name: "plugin.yml",
        data: "name: KubekCompanion\nversion: '1.0.0'\n",
        deflate: true,
      },
      { name: "stored.txt", data: "plain" },
    ]),
  );

  test("reads a deflated entry", async () => {
    const data = await readZipEntry(jar, "plugin.yml");
    expect(data?.toString()).toContain("name: KubekCompanion");
  });

  test("reads a stored entry", async () => {
    expect((await readZipEntry(jar, "stored.txt"))?.toString()).toBe("plain");
  });

  test("null for a missing entry", async () => {
    expect(await readZipEntry(jar, "nope.yml")).toBeNull();
  });

  test("null for entries over the limit", async () => {
    expect(await readZipEntry(jar, "plugin.yml", 4)).toBeNull();
  });

  test("null for a file that isn't a zip", async () => {
    const path = write("broken.jar", Buffer.from("not a zip at all"));
    expect(await readZipEntry(path, "plugin.yml")).toBeNull();
  });
});
