import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { BackupFormat, BackupStatus } from "@shared/types/backup.types";
import type {
  BackupRecord,
  BackupsRepository,
} from "../repositories/backups.repository";
import type { BackupCopiesRepository } from "../repositories/backup-copies.repository";
import { LocalBackupStore } from "../archive/local-store";
import { fake } from "@/testing/fake";
import { BackupOrphansService } from "./backup-orphans.service";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "kubek-orphans-"));
  const local = new LocalBackupStore();
  Object.assign(local, { root });
  mkdirSync(join(root, "srv"));
  mkdirSync(join(root, "restore-x"));
  for (const key of [
    "legacy.zip",
    "srv/known.zip",
    "srv/lost.tar.gz",
    "srv/creating.zip",
    "srv/notes.txt",
    "restore-x/staged.zip",
  ]) {
    writeFileSync(join(root, key), "x");
  }
  const copies = fake<BackupCopiesRepository>({
    localKeys: () => ["legacy.zip", "srv/known.zip"],
  });
  const backups = fake<BackupsRepository>({
    findByStatus: (status) =>
      status === BackupStatus.CREATING
        ? [
            fake<BackupRecord>({
              serverId: "srv",
              id: "creating",
              format: BackupFormat.ZIP,
            }),
          ]
        : [],
  });
  return new BackupOrphansService(copies, backups, local);
}

describe("BackupOrphansService", () => {
  test("lists archives no copy or running backup points to", async () => {
    const keys = (await setup().list()).map((a) => a.key);
    expect(keys).toEqual(["srv/lost.tar.gz"]);
  });

  test("removes only keys that are still orphans", async () => {
    const orphans = setup();
    expect(await orphans.remove(["srv/lost.tar.gz", "srv/known.zip"])).toBe(1);
    expect(await orphans.list()).toEqual([]);
  });
});
