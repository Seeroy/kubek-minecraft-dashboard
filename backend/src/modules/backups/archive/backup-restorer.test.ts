import { afterEach, describe, expect, test } from "bun:test";
import { BadRequestException } from "@nestjs/common";
import { BackupFormat, BackupType } from "@shared/types/backup.types";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "fs";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { packArchive } from "./backup-archiver";
import { collectBackupFiles } from "./backup-files";
import { restoreInto } from "./backup-restorer";

const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "kubek-restore-"));
  dirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

async function put(root: string, rel: string, content: string) {
  await mkdir(join(root, rel, ".."), { recursive: true });
  await writeFile(join(root, rel), content);
}

describe.each([BackupFormat.ZIP, BackupFormat.TAR_GZ])(
  "%s round trip",
  (format) => {
    test("restores files, drops new ones and keeps excluded paths", async () => {
      const server = tempDir();
      await put(server, "server.properties", "motd=before");
      await put(server, "world/level.dat", "level");
      await put(server, "logs/latest.log", "old log");

      const backup = {
        id: "b",
        serverId: "s",
        type: BackupType.FULL,
        globExceptions: ["*.log"],
      } as Parameters<typeof collectBackupFiles>[0];
      const entries = await collectBackupFiles(backup, server);
      expect(entries.map((e) => e.path).sort()).toEqual([
        "server.properties",
        "world/level.dat",
      ]);

      const archive = join(tempDir(), `a.${format}`);
      await packArchive(entries, server, archive, format, () => {});

      await put(server, "server.properties", "motd=after");
      await put(server, "world/new-region.mca", "junk");
      await put(server, "logs/latest.log", "new log");

      await restoreInto(archive, tempDir(), server, backup, () => {});

      expect(readFileSync(join(server, "server.properties"), "utf8")).toBe(
        "motd=before",
      );
      expect(existsSync(join(server, "world/new-region.mca"))).toBe(false);
      expect(readFileSync(join(server, "logs/latest.log"), "utf8")).toBe(
        "new log",
      );
    });
  },
);

describe("links planted by the server", () => {
  const cwd = process.cwd();
  afterEach(() => process.chdir(cwd));

  test("a selected path under a linked folder is refused", async () => {
    const root = tempDir();
    process.chdir(root);
    const server = join(root, "servers", "s");
    await put(root, "data/db.sql", "secret");
    await mkdir(server, { recursive: true });
    symlinkSync(join(root, "data"), join(server, "world"));

    const backup = {
      id: "b",
      serverId: "s",
      type: BackupType.PARTIAL,
      selectedFiles: [{ path: "world/db.sql" }],
    } as Parameters<typeof collectBackupFiles>[0];

    await expect(collectBackupFiles(backup, server)).rejects.toThrow(
      BadRequestException,
    );
  });

  test("a restore replaces a linked folder instead of writing through it", async () => {
    const outside = tempDir();
    const server = tempDir();
    await put(server, "world/level.dat", "level");
    const backup = {
      id: "b",
      serverId: "s",
      type: BackupType.PARTIAL,
      selectedFiles: [{ path: "world" }],
    } as Parameters<typeof collectBackupFiles>[0];
    const archive = join(tempDir(), "a.zip");
    await packArchive(
      [{ path: "world/level.dat", size: 5 }],
      server,
      archive,
      BackupFormat.ZIP,
      () => {},
    );

    rmSync(join(server, "world"), { recursive: true });
    symlinkSync(outside, join(server, "world"));
    await restoreInto(archive, tempDir(), server, backup, () => {});

    expect(existsSync(join(outside, "level.dat"))).toBe(false);
    expect(lstatSync(join(server, "world")).isDirectory()).toBe(true);
    expect(readFileSync(join(server, "world/level.dat"), "utf8")).toBe("level");
  });
});
