import { afterAll, describe, expect, test } from "bun:test";
import compressing from "compressing";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";
import { extractOverrideLayer, scanPackArchive } from "./mrpack-archive";

const dir = mkdtempSync(join(tmpdir(), "kubek-mrpack-zip-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function makeZip(
  name: string,
  entries: Record<string, string>,
): Promise<string> {
  const zip = new compressing.zip.Stream();
  for (const [path, content] of Object.entries(entries)) {
    zip.addEntry(Buffer.from(content), { relativePath: path });
  }
  const target = join(dir, name);
  await pipeline(zip, createWriteStream(target));
  return target;
}

describe("scanPackArchive", () => {
  test("reads the index and notes client overrides", async () => {
    const archive = await makeZip("scan.mrpack", {
      "modrinth.index.json": JSON.stringify({ formatVersion: 1 }),
      "overrides/config/a.toml": "a=1",
      "server-overrides/config/a.toml": "a=2",
      "client-overrides/options.txt": "fov=90",
    });
    const scan = await scanPackArchive(archive);
    expect(scan.index).toEqual({ formatVersion: 1 });
    expect(scan.hasClientOverrides).toBe(true);
    expect(scan.overrideFiles).toBe(2);
  });

  test("fails without an index", async () => {
    const archive = await makeZip("noindex.mrpack", { "overrides/a": "x" });
    expect(
      await scanPackArchive(archive).then(
        () => "ok",
        (error: Error) => error.message,
      ),
    ).toContain("missing");
  });

  test("fails on a file that is not a zip", async () => {
    const path = join(dir, "junk.mrpack");
    await Bun.write(path, "definitely not a zip");
    expect(
      await scanPackArchive(path).then(
        () => "ok",
        (error: Error) => error.message,
      ),
    ).toContain("not a readable");
  });
});

describe("extractOverrideLayer", () => {
  test("server overrides land on top, client overrides never land", async () => {
    const archive = await makeZip("layers.mrpack", {
      "modrinth.index.json": "{}",
      "overrides/config/a.toml": "a=1",
      "overrides/config/b.toml": "b=1",
      "server-overrides/config/a.toml": "a=2",
      "client-overrides/options.txt": "fov=90",
    });
    const server = join(dir, "server");
    mkdirSync(server);

    expect(await extractOverrideLayer(archive, server, "overrides")).toBe(2);
    expect(
      await extractOverrideLayer(archive, server, "server-overrides"),
    ).toBe(1);
    expect(readFileSync(join(server, "config/a.toml"), "utf8")).toBe("a=2");
    expect(readFileSync(join(server, "config/b.toml"), "utf8")).toBe("b=1");
    expect(existsSync(join(server, "options.txt"))).toBe(false);
  });
});
