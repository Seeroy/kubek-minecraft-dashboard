import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { fake } from "@/testing/fake";
import { FileBatchService } from "./file-batch.service";
import { FileManagerService } from "./file-manager.service";

const bus = fake<ExtensionEventBus>({ publish: () => {} });
const files = new FileManagerService(bus);
const batch = new FileBatchService();
const upload = (name: string) =>
  fake<Express.Multer.File>({ originalname: name, buffer: Buffer.from("up") });

let cwd: string;
let root: string;
let outside: string;

async function rejection(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

beforeAll(() => {
  cwd = process.cwd();
  root = mkdtempSync(join(tmpdir(), "kubek-files-"));
  process.chdir(root);
  const server = join(root, "servers", "srv");
  outside = join(root, "outside");
  mkdirSync(join(server, "config"), { recursive: true });
  mkdirSync(join(outside, "dir"), { recursive: true });
  writeFileSync(join(server, "config", "a.txt"), "inside");
  writeFileSync(join(outside, "secret.txt"), "secret");
  // Links a game server could make
  symlinkSync(join(outside, "secret.txt"), join(server, "secret-link"));
  symlinkSync(outside, join(server, "escape"));
  symlinkSync(join(server, "config"), join(server, "config-link"));
  symlinkSync(join(outside, "new.txt"), join(server, "dangling"));
});

afterAll(() => {
  process.chdir(cwd);
  rmSync(root, { recursive: true, force: true });
});

describe("FileManagerService real path jail", () => {
  test("reads regular files and links that stay inside", async () => {
    expect((await files.readFile("srv", "config/a.txt")).toString()).toBe(
      "inside",
    );
    expect((await files.readFile("srv", "config-link/a.txt")).toString()).toBe(
      "inside",
    );
  });

  test("refuses to read through a link out of the server", async () => {
    expect(await rejection(files.readFile("srv", "secret-link"))).toContain(
      "directory traversal",
    );
    expect(
      await rejection(files.readFile("srv", "escape/secret.txt")),
    ).toContain("directory traversal");
  });

  test("refuses to write through a link out of the server", async () => {
    expect(
      await rejection(files.writeFile("srv", "escape/evil.txt", "x")),
    ).toContain("directory traversal");
    expect(
      await rejection(files.writeFile("srv", "secret-link", "x")),
    ).toContain("directory traversal");
    expect(await rejection(files.writeFile("srv", "dangling", "x"))).toContain(
      "directory traversal",
    );
    expect(existsSync(join(outside, "evil.txt"))).toBe(false);
    expect(existsSync(join(outside, "new.txt"))).toBe(false);
    expect(readFileSync(join(outside, "secret.txt"), "utf8")).toBe("secret");
  });

  test("still writes new files in new folders", async () => {
    await files.writeFile("srv", "plugins/x/config.yml", "ok");
    expect(
      readFileSync(join(root, "servers/srv/plugins/x/config.yml"), "utf8"),
    ).toBe("ok");
  });

  test("refuses to upload into a link out of the server", async () => {
    expect(
      await rejection(files.uploadFile("srv", "escape", upload("u.txt"))),
    ).toContain("directory traversal");
    expect(existsSync(join(outside, "u.txt"))).toBe(false);
    await files.uploadFile("srv", "config", upload("u.txt"));
    expect(readFileSync(join(root, "servers/srv/config/u.txt"), "utf8")).toBe(
      "up",
    );
  });

  test("refuses to list or search a folder out of the server", async () => {
    expect(await rejection(files.scanDirectory("srv", "escape/dir"))).toContain(
      "directory traversal",
    );
    expect(
      await rejection(files.searchFiles("srv", "secret", "escape")),
    ).toContain("directory traversal");
  });

  test("refuses to delete through a link out of the server", async () => {
    expect(
      await rejection(files.deleteFile("srv", "escape/secret.txt")),
    ).toContain("directory traversal");
    expect(
      await rejection(files.deleteDirectory("srv", "escape/dir")),
    ).toContain("directory traversal");
    expect(
      await rejection(
        batch.deletePaths("srv", ["escape/secret.txt", "escape/dir"]),
      ),
    ).toContain("directory traversal");
    expect(existsSync(join(outside, "secret.txt"))).toBe(true);
    expect(existsSync(join(outside, "dir"))).toBe(true);
  });

  test("deleting the link itself keeps its target", async () => {
    const server = join(root, "servers", "srv");
    symlinkSync(join(outside, "secret.txt"), join(server, "link-a"));
    symlinkSync(outside, join(server, "link-b"));
    await files.deleteFile("srv", "link-a");
    await batch.deletePaths("srv", ["link-b"]);
    expect(existsSync(join(server, "link-a"))).toBe(false);
    expect(existsSync(join(server, "link-b"))).toBe(false);
    expect(readFileSync(join(outside, "secret.txt"), "utf8")).toBe("secret");
  });

  test("refuses to rename or create folders through a link out of the server", async () => {
    expect(
      await rejection(
        files.renameFile("srv", "escape/secret.txt", "moved.txt"),
      ),
    ).toContain("directory traversal");
    expect(
      await rejection(
        files.renameFile("srv", "config/a.txt", "../escape/a.txt"),
      ),
    ).toContain("directory traversal");
    expect(
      await rejection(files.createDirectory("srv", "escape", "made")),
    ).toContain("directory traversal");
    expect(existsSync(join(outside, "secret.txt"))).toBe(true);
    expect(existsSync(join(outside, "a.txt"))).toBe(false);
    expect(existsSync(join(outside, "made"))).toBe(false);
  });

  test("renaming a link renames the link, not its target", async () => {
    const server = join(root, "servers", "srv");
    symlinkSync(join(outside, "secret.txt"), join(server, "link-c"));
    await files.renameFile("srv", "link-c", "link-d");
    expect(lstatSync(join(server, "link-d")).isSymbolicLink()).toBe(true);
    expect(existsSync(join(outside, "secret.txt"))).toBe(true);
  });

  test("refuses to zip or unzip through a link out of the server", async () => {
    expect(
      await rejection(
        batch.createZipArchive("srv", ["escape/secret.txt"], "", "loot"),
      ),
    ).toContain("directory traversal");
    expect(
      await rejection(
        batch.createZipArchive("srv", ["config/a.txt"], "escape/dir", "loot"),
      ),
    ).toContain("directory traversal");
    expect(existsSync(join(root, "servers/srv/loot.zip"))).toBe(false);
    expect(existsSync(join(outside, "dir/loot.zip"))).toBe(false);

    writeFileSync(join(outside, "drop.zip"), "");
    expect(
      await rejection(batch.extractZipArchive("srv", "escape/drop.zip")),
    ).toContain("directory traversal");
  });
});
