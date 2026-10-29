import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { gzipSync } from "zlib";
import { pack, unpack, unpackArchive, walkArchive } from "./archives";

interface RawEntry {
  name: string;
  data?: string;
  /** tar typeflag, "0" file, "2" symlink, "5" directory */
  tarType?: string;
  linkname?: string;
  /** Full unix mode for zip entries */
  zipMode?: number;
}

// Built by hand, normal tools won't write unsafe names

function tarHeader(entry: RawEntry, size: number): Buffer {
  const h = Buffer.alloc(512);
  const put = (value: string, offset: number, length: number) =>
    h.write(value.slice(0, length), offset, length, "utf8");
  const octal = (n: number, length: number) =>
    n.toString(8).padStart(length - 1, "0") + "\0";
  put(entry.name, 0, 100);
  put(octal(0o644, 8), 100, 8);
  put(octal(0, 8), 108, 8);
  put(octal(0, 8), 116, 8);
  put(octal(size, 12), 124, 12);
  put(octal(0, 12), 136, 12);
  put("        ", 148, 8);
  put(entry.tarType ?? "0", 156, 1);
  put(entry.linkname ?? "", 157, 100);
  put("ustar\0", 257, 6);
  put("00", 263, 2);
  let sum = 0;
  for (const byte of h) sum += byte;
  put(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
  return h;
}

function buildTar(entries: RawEntry[]): Buffer {
  const parts: Buffer[] = [];
  for (const entry of entries) {
    const data = Buffer.from(entry.data ?? "");
    parts.push(tarHeader(entry, data.length), data);
    const pad = (512 - (data.length % 512)) % 512;
    parts.push(Buffer.alloc(pad));
  }
  parts.push(Buffer.alloc(1024));
  return Buffer.concat(parts);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(entries: RawEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = Buffer.from(entry.data ?? "");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(((entry.zipMode ?? 0o100644) << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

let root: string;
let dest: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "kubek-archives-"));
  dest = join(root, "dest");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(name: string, data: Buffer): string {
  const file = join(root, name);
  writeFileSync(file, data);
  return file;
}

/** Everything in root except the archive and dest */
function strayFiles(...archives: string[]): string[] {
  return readdirSync(root).filter(
    (f) => f !== "dest" && !archives.some((a) => a.endsWith(f)),
  );
}

/** Rejection message, null if it resolved */
async function rejection(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

describe("unpack", () => {
  test("extracts zip files and folders", async () => {
    const archive = write(
      "ok.zip",
      buildZip([
        { name: "config/", zipMode: 0o40755 },
        { name: "config/a.txt", data: "a" },
        { name: "b.txt", data: "bb" },
      ]),
    );
    await unpack(archive, dest);
    expect(readFileSync(join(dest, "config/a.txt"), "utf8")).toBe("a");
    expect(readFileSync(join(dest, "b.txt"), "utf8")).toBe("bb");
  });

  test("extracts tar.gz and can delete the archive", async () => {
    const archive = write(
      "ok.tar.gz",
      gzipSync(
        buildTar([
          { name: "world/", tarType: "5" },
          { name: "world/level.dat", data: "lvl" },
        ]),
      ),
    );
    await unpack(archive, dest, { deleteAfter: true });
    expect(readFileSync(join(dest, "world/level.dat"), "utf8")).toBe("lvl");
    expect(existsSync(archive)).toBe(false);
  });

  test("rejects a tar.gz entry with ../", async () => {
    const archive = write(
      "evil.tar.gz",
      gzipSync(buildTar([{ name: "../evil.txt", data: "x" }])),
    );
    expect(await rejection(unpack(archive, dest))).toContain("unsafe paths");
    expect(strayFiles(archive)).toEqual([]);
  });

  test("keeps a zip entry with ../ inside the destination", async () => {
    const archive = write(
      "evil.zip",
      buildZip([{ name: "../evil.txt", data: "x" }]),
    );
    await unpack(archive, dest).catch(() => {});
    expect(strayFiles(archive)).toEqual([]);
  });

  test("absolute entry names stay inside the destination", async () => {
    const tar = write(
      "abs.tar",
      buildTar([{ name: "/abs-evil.txt", data: "x" }]),
    );
    const zip = write(
      "abs.zip",
      buildZip([{ name: "/abs-evil.txt", data: "x" }]),
    );
    await unpack(tar, dest).catch(() => {});
    await unpack(zip, dest).catch(() => {});
    expect(strayFiles(tar, zip)).toEqual([]);
    expect(existsSync("/abs-evil.txt")).toBe(false);
  });

  test("skips symlink entries in tar and zip", async () => {
    const tar = write(
      "link.tar",
      buildTar([
        { name: "link", tarType: "2", linkname: "/etc/passwd" },
        { name: "real.txt", data: "r" },
      ]),
    );
    const zip = write(
      "link.zip",
      buildZip([
        { name: "zlink", data: "/etc/passwd", zipMode: 0o120777 },
        { name: "zreal.txt", data: "z" },
      ]),
    );
    await unpack(tar, dest);
    await unpack(zip, dest);
    expect(existsSync(join(dest, "link"))).toBe(false);
    expect(existsSync(join(dest, "zlink"))).toBe(false);
    expect(readFileSync(join(dest, "real.txt"), "utf8")).toBe("r");
    expect(readFileSync(join(dest, "zreal.txt"), "utf8")).toBe("z");
  });

  test("does not write through a symlink already in the destination", async () => {
    const outside = join(root, "outside");
    mkdirSync(outside);
    mkdirSync(dest);
    symlinkSync(outside, join(dest, "world"));
    const archive = write(
      "through.zip",
      buildZip([{ name: "world/evil.txt", data: "x" }]),
    );
    expect(await rejection(unpack(archive, dest))).toContain("unsafe paths");
    expect(readdirSync(outside)).toEqual([]);
    expect(lstatSync(join(dest, "world")).isSymbolicLink()).toBe(true);
  });

  test("a broken archive is an error, not a silent success", async () => {
    const zip = write("broken.zip", Buffer.from("definitely not a zip"));
    const tgz = write("broken.tar.gz", Buffer.from("not gzip either"));
    expect(await rejection(unpack(zip, dest))).toBeTruthy();
    expect(await rejection(unpack(tgz, dest))).toBeTruthy();
    expect(await unpackArchive(zip, dest, true)).toBe(false);
    // The archive stays after a failed unpack
    expect(existsSync(zip)).toBe(true);
  });

  test("reports real progress up to the archive size", async () => {
    const files = Array.from({ length: 5 }, (_, i) => ({
      name: `f${i}.txt`,
      data: "x".repeat(1000),
    }));
    const archive = write("progress.zip", buildZip(files));
    const total = lstatSync(archive).size;
    const seen: number[] = [];
    await unpack(archive, dest, {
      onProgress: (done, all) => {
        expect(all).toBe(total);
        seen.push(done);
      },
    });
    expect(seen).toHaveLength(5);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    expect(seen[4]).toBeGreaterThan(seen[0]);
    expect(seen[4]).toBeLessThanOrEqual(total);
  });

  test("reports progress for tar.gz by bytes read", async () => {
    const files = Array.from({ length: 3 }, (_, i) => ({
      name: `f${i}.txt`,
      data: String(i).repeat(2000),
    }));
    const archive = write("progress.tgz", gzipSync(buildTar(files)));
    const seen: Array<[number, number]> = [];
    await unpack(archive, dest, {
      onProgress: (done, all) => seen.push([done, all]),
    });
    expect(seen).toHaveLength(3);
    for (const [done, all] of seen) {
      expect(done).toBeGreaterThan(0);
      expect(done).toBeLessThanOrEqual(all);
    }
  });
});

describe("pack", () => {
  test("round trips files and a directory through zip and tgz", async () => {
    const src = join(root, "src");
    mkdirSync(join(src, "sub"), { recursive: true });
    writeFileSync(join(src, "a.txt"), "a");
    writeFileSync(join(src, "sub", "b.txt"), "b");

    for (const type of ["zip", "tgz"] as const) {
      const out = join(root, `out.${type === "zip" ? "zip" : "tar.gz"}`);
      let last = 0;
      await pack([{ path: src, ignoreBase: true }], out, {
        type,
        totalBytes: 2,
        onProgress: (written) => (last = written),
      });
      expect(last).toBeGreaterThan(0);
      const target = join(root, `unpacked-${type}`);
      await unpack(out, target);
      expect(readFileSync(join(target, "a.txt"), "utf8")).toBe("a");
      expect(readFileSync(join(target, "sub", "b.txt"), "utf8")).toBe("b");
    }
  });

  test("names single files by relativePath", async () => {
    const file = join(root, "c.txt");
    writeFileSync(file, "c");
    const out = join(root, "single.zip");
    await pack([{ path: file, relativePath: "dir/renamed.txt" }], out);
    const names: string[] = [];
    await walkArchive(out, (header, stream) => {
      names.push(header.name);
      stream.resume();
      return Promise.resolve();
    });
    expect(names).toEqual(["dir/renamed.txt"]);
  });
});
