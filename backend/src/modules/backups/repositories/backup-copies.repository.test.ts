import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import {
  BackupCopyStatus,
  BackupFormat,
  BackupStatus,
  BackupType,
} from "@shared/types/backup.types";
import { ServerStatus } from "@shared/types/server/server.types";
import {
  type StoredCopy,
  BackupCopiesRepository,
} from "./backup-copies.repository";
import { BackupStoragesRepository } from "./backup-storages.repository";
import { BackupsRepository } from "./backups.repository";

let copies: BackupCopiesRepository;
let storages: BackupStoragesRepository;
let backups: BackupsRepository;
let s3: string;

const addBackup = (id: string, serverId: string) =>
  backups.create({
    id,
    name: id,
    type: BackupType.FULL,
    status: BackupStatus.COMPLETED,
    createdAt: 1,
    updatedAt: 1,
    fileCount: 0,
    totalSize: 0,
    serverId,
    format: BackupFormat.ZIP,
    pinned: false,
  });

const copy = (
  backupId: string,
  storageId: string | null,
  extra: Partial<Omit<StoredCopy, "id" | "createdAt" | "updatedAt">> = {},
) =>
  copies.create({
    backupId,
    storageId,
    objectKey: `${backupId}-${storageId ?? "local"}.zip`,
    size: 10,
    status: BackupCopyStatus.READY,
    error: null,
    ...extra,
  });

beforeEach(() => {
  setSystemTime(new Date(1000));
  const provider = sqliteProvider(memoryDatabase());
  copies = new BackupCopiesRepository(provider);
  storages = new BackupStoragesRepository(provider);
  backups = new BackupsRepository(provider);
  const serverId = new ServersRepository(provider).create({
    name: "Lobby",
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: false, attempts: 0 },
    blueprintId: "paper",
    variables: {},
  }).id;
  addBackup("b1", serverId);
  addBackup("b2", serverId);
  s3 = storages.create({
    name: "S3",
    driver: "s3",
    config: {
      endpoint: "https://s3.example.com",
      region: "eu",
      bucket: "kubek",
      prefix: "",
      accessKeyId: "id",
      secretAccessKey: "secret",
      virtualHostedStyle: false,
    },
  }).id;
});

afterEach(() => {
  setSystemTime();
});

describe("BackupCopiesRepository", () => {
  test("a copy reads back as created", () => {
    const created = copy("b1", s3, {
      status: BackupCopyStatus.FAILED,
      error: "timeout",
      size: 0,
    });
    expect(created).toEqual({
      id: created.id,
      backupId: "b1",
      storageId: s3,
      objectKey: `b1-${s3}.zip`,
      size: 0,
      status: BackupCopyStatus.FAILED,
      error: "timeout",
      createdAt: 1000,
      updatedAt: 1000,
    });
    expect(copies.findById(created.id)).toEqual(created);
  });

  test("findAt tells the panel disk copy from the remote one", () => {
    const local = copy("b1", null);
    const remote = copy("b1", s3);
    expect(copies.findAt("b1", null)?.id).toBe(local.id);
    expect(copies.findAt("b1", s3)?.id).toBe(remote.id);
    expect(copies.findAt("b2", null)).toBeNull();
  });

  test("a backup has at most one copy per location", () => {
    copy("b1", null);
    copy("b1", s3);
    expect(() => copy("b1", null)).toThrow("UNIQUE constraint failed");
    expect(() => copy("b1", s3)).toThrow("UNIQUE constraint failed");
    expect(copies.findByBackup("b1")).toHaveLength(2);
  });

  test("lists copies per backup, per several backups and by status", () => {
    const first = copy("b1", null);
    setSystemTime(new Date(2000));
    const second = copy("b1", s3, { status: BackupCopyStatus.UPLOADING });
    const other = copy("b2", null);

    expect(copies.findByBackup("b1").map((c) => c.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(
      copies
        .findByBackups(["b1", "b2"])
        .map((c) => c.id)
        .sort(),
    ).toEqual([first.id, second.id, other.id].sort());
    expect(copies.findByBackups([])).toEqual([]);
    expect(
      copies.findByStatus(BackupCopyStatus.UPLOADING).map((c) => c.id),
    ).toEqual([second.id]);
  });

  test("counts copies in a storage and lists keys on the panel disk", () => {
    copy("b1", null, { objectKey: "srv/b1.zip" });
    copy("b2", null, { objectKey: "srv/b2.zip" });
    copy("b1", s3);
    expect(copies.countForStorage(s3)).toBe(1);
    expect(copies.localKeys().sort()).toEqual(["srv/b1.zip", "srv/b2.zip"]);
  });

  test("setStatus keeps the size unless given and replaces the error", () => {
    const created = copy("b1", s3, {
      status: BackupCopyStatus.UPLOADING,
      size: 0,
    });
    setSystemTime(new Date(3000));

    copies.setStatus(created.id, BackupCopyStatus.FAILED, { error: "denied" });
    expect(copies.findById(created.id)).toMatchObject({
      status: BackupCopyStatus.FAILED,
      size: 0,
      error: "denied",
      updatedAt: 3000,
    });

    copies.setStatus(created.id, BackupCopyStatus.READY, { size: 2048 });
    expect(copies.findById(created.id)).toMatchObject({
      status: BackupCopyStatus.READY,
      size: 2048,
      error: null,
    });
  });

  test("delete removes only that copy", () => {
    const local = copy("b1", null);
    const remote = copy("b1", s3);
    copies.delete(local.id);
    expect(copies.findByBackup("b1").map((c) => c.id)).toEqual([remote.id]);
  });

  test("a storage that still holds copies cannot be deleted", () => {
    copy("b1", s3);
    expect(() => storages.delete(s3)).toThrow("FOREIGN KEY constraint failed");
    expect(storages.findById(s3)?.name).toBe("S3");
  });

  test("a copy needs an existing backup and storage", () => {
    expect(() => copy("ghost", null)).toThrow("FOREIGN KEY constraint failed");
    expect(() => copy("b1", "ghost")).toThrow("FOREIGN KEY constraint failed");
  });
});
