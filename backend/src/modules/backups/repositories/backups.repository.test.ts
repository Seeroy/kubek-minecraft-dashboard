import { beforeEach, describe, expect, test } from "bun:test";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import {
  BackupCopyStatus,
  BackupFormat,
  BackupStatus,
  BackupType,
  SelectionMode,
} from "@shared/types/backup.types";
import { ServerStatus } from "@shared/types/server/server.types";
import { BackupCopiesRepository } from "./backup-copies.repository";
import { type BackupRecord, BackupsRepository } from "./backups.repository";
import { testUser } from "@/testing/user";

let backups: BackupsRepository;
let copies: BackupCopiesRepository;
let servers: ServersRepository;
let users: UsersRepository;
let serverId: string;

const addServer = (name: string) =>
  servers.create({
    name,
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: false, attempts: 0 },
    blueprintId: "paper",
    variables: {},
  }).id;

const backup = (
  id: string,
  extra: Partial<BackupRecord> = {},
): BackupRecord => ({
  id,
  name: `backup ${id}`,
  type: BackupType.FULL,
  status: BackupStatus.COMPLETED,
  createdAt: 100,
  updatedAt: 100,
  fileCount: 0,
  totalSize: 0,
  serverId,
  format: BackupFormat.ZIP,
  selectionMode: SelectionMode.ALL,
  pinned: false,
  ...extra,
});

beforeEach(() => {
  const provider = sqliteProvider(memoryDatabase());
  backups = new BackupsRepository(provider);
  copies = new BackupCopiesRepository(provider);
  servers = new ServersRepository(provider);
  users = new UsersRepository(provider);
  users.create(testUser("alice"));
  serverId = addServer("Lobby");
});

describe("BackupsRepository", () => {
  test("a partial backup reads back with its file rules", () => {
    backups.create(
      backup("b1", {
        description: "before update",
        type: BackupType.PARTIAL,
        status: BackupStatus.CREATING,
        fileCount: 12,
        totalSize: 4096,
        selectedFiles: [
          { name: "world", path: "world" },
          { name: "config.yml", path: "plugins/x/config.yml" },
        ],
        globExceptions: ["*.log", "cache/**"],
        ownerId: "alice",
        format: BackupFormat.TAR_GZ,
        compressionRatio: 6,
        selectionMode: SelectionMode.CUSTOM,
        pinned: true,
        checksum: "abc123",
      }),
    );

    expect(backups.findById("b1")).toEqual({
      id: "b1",
      name: "backup b1",
      description: "before update",
      type: BackupType.PARTIAL,
      status: BackupStatus.CREATING,
      createdAt: 100,
      updatedAt: 100,
      fileCount: 12,
      totalSize: 4096,
      selectedFiles: [
        { name: "world", path: "world" },
        { name: "config.yml", path: "plugins/x/config.yml" },
      ],
      serverId,
      ownerId: "alice",
      format: BackupFormat.TAR_GZ,
      compressionRatio: 6,
      selectionMode: SelectionMode.CUSTOM,
      globExceptions: ["*.log", "cache/**"],
      pinned: true,
      checksum: "abc123",
    });
  });

  test("a full backup without extras comes back with them undefined", () => {
    backups.create(backup("b1"));
    expect(backups.findById("b1")).toEqual({
      id: "b1",
      name: "backup b1",
      description: undefined,
      type: BackupType.FULL,
      status: BackupStatus.COMPLETED,
      createdAt: 100,
      updatedAt: 100,
      fileCount: 0,
      totalSize: 0,
      selectedFiles: undefined,
      serverId,
      ownerId: undefined,
      format: BackupFormat.ZIP,
      compressionRatio: undefined,
      selectionMode: SelectionMode.ALL,
      globExceptions: undefined,
      pinned: false,
      checksum: undefined,
    });
  });

  test("rules of several backups do not mix", () => {
    backups.create(backup("a", { globExceptions: ["a.log"] }));
    backups.create(backup("b", { globExceptions: ["b.log", "c.log"] }));
    expect(
      backups.findAll().map((b) => [b.id, b.globExceptions] as const),
    ).toEqual([
      ["a", ["a.log"]],
      ["b", ["b.log", "c.log"]],
    ]);
  });

  test("lists newest first, per server and by status", () => {
    const other = addServer("Other");
    backups.create(backup("old", { createdAt: 1 }));
    backups.create(
      backup("new", { createdAt: 3, status: BackupStatus.FAILED }),
    );
    backups.create(backup("elsewhere", { createdAt: 2, serverId: other }));

    expect(backups.findAll().map((b) => b.id)).toEqual([
      "new",
      "elsewhere",
      "old",
    ]);
    expect(backups.findByServerId(serverId).map((b) => b.id)).toEqual([
      "new",
      "old",
    ]);
    expect(backups.findByStatus(BackupStatus.FAILED).map((b) => b.id)).toEqual([
      "new",
    ]);
  });

  test("update writes the row but keeps the pin and the rules", () => {
    backups.create(
      backup("b1", {
        globExceptions: ["*.log"],
        status: BackupStatus.CREATING,
      }),
    );
    backups.setPinned("b1", true);

    backups.update(
      backup("b1", {
        status: BackupStatus.COMPLETED,
        updatedAt: 500,
        fileCount: 3,
        totalSize: 999,
        checksum: "sum",
        pinned: false,
        globExceptions: ["other"],
      }),
    );

    expect(backups.findById("b1")).toMatchObject({
      status: BackupStatus.COMPLETED,
      updatedAt: 500,
      fileCount: 3,
      totalSize: 999,
      checksum: "sum",
      pinned: true,
      globExceptions: ["*.log"],
    });
  });

  test("setPinned toggles the pin", () => {
    backups.create(backup("b1"));
    backups.setPinned("b1", true);
    expect(backups.findById("b1")?.pinned).toBe(true);
    backups.setPinned("b1", false);
    expect(backups.findById("b1")?.pinned).toBe(false);
  });

  test("the database refuses an out of range compression ratio", () => {
    expect(() =>
      backups.create(backup("b1", { compressionRatio: 10 })),
    ).toThrow("CHECK constraint failed");
    expect(backups.findById("b1")).toBeNull();
  });

  test("deleting a backup removes its copies and rules", () => {
    backups.create(backup("b1", { globExceptions: ["*.log"] }));
    copies.create({
      backupId: "b1",
      storageId: null,
      objectKey: "b1.zip",
      size: 1,
      status: BackupCopyStatus.READY,
      error: null,
    });

    backups.delete("b1");

    expect(backups.findById("b1")).toBeNull();
    expect(copies.findByBackup("b1")).toEqual([]);
    backups.create(backup("b1"));
    expect(backups.findById("b1")?.globExceptions).toBeUndefined();
  });

  test("deleting the server removes its backups, deleting the owner keeps them", () => {
    backups.create(backup("b1", { ownerId: "alice" }));
    users.delete("alice");
    expect(backups.findById("b1")?.ownerId).toBeUndefined();

    servers.delete(serverId);
    expect(backups.findAll()).toEqual([]);
  });
});
