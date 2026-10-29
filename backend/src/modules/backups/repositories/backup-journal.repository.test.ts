import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import { BackupJournalOp } from "@shared/types/backup.types";
import { ServerStatus } from "@shared/types/server/server.types";
import {
  BackupJournalRepository,
  type JournalInput,
} from "./backup-journal.repository";
import { BackupStoragesRepository } from "./backup-storages.repository";
import { testUser } from "@/testing/user";

let journal: BackupJournalRepository;
let servers: ServersRepository;
let users: UsersRepository;
let storages: BackupStoragesRepository;
let serverId: string;

const addServer = (name: string) =>
  servers.create({
    name,
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: false, attempts: 0 },
    blueprintId: "paper",
    variables: {},
  }).id;

const entry = (extra: Partial<JournalInput> = {}): JournalInput => ({
  serverId,
  backupId: null,
  backupName: null,
  storageId: null,
  op: BackupJournalOp.CREATE,
  status: "success",
  message: null,
  bytes: null,
  durationMs: null,
  trigger: "system",
  userId: null,
  ...extra,
});

const write = (at: number, extra: Partial<JournalInput> = {}) => {
  setSystemTime(new Date(at));
  journal.create(entry(extra));
};

beforeEach(() => {
  const provider = sqliteProvider(memoryDatabase());
  journal = new BackupJournalRepository(provider);
  servers = new ServersRepository(provider);
  users = new UsersRepository(provider);
  storages = new BackupStoragesRepository(provider);
  users.create(testUser("alice"));
  serverId = addServer("Lobby");
});

afterEach(() => {
  setSystemTime();
});

describe("BackupJournalRepository", () => {
  test("an entry reads back with the current name of its user", () => {
    const s3 = storages.create({
      name: "S3",
      driver: "s3",
      config: {
        endpoint: "e",
        region: "r",
        bucket: "b",
        prefix: "",
        accessKeyId: "a",
        secretAccessKey: "s",
        virtualHostedStyle: false,
      },
    }).id;
    write(1000, {
      backupId: "gone-backup",
      backupName: "nightly",
      storageId: s3,
      op: BackupJournalOp.UPLOAD,
      status: "failed",
      message: "403",
      bytes: 2048,
      durationMs: 1500,
      trigger: "user",
      userId: "alice",
    });

    const [read] = journal.findByServer(serverId, { limit: 10 });
    expect(read).toEqual({
      id: read.id,
      serverId,
      backupId: "gone-backup",
      backupName: "nightly",
      storageId: s3,
      op: BackupJournalOp.UPLOAD,
      status: "failed",
      message: "403",
      bytes: 2048,
      durationMs: 1500,
      trigger: "user",
      userId: "alice",
      username: "alice",
      createdAt: 1000,
    });
  });

  test("entries come newest first and page with a cursor", () => {
    for (const at of [100, 200, 200, 300]) write(at, { message: String(at) });
    write(400, { serverId: addServer("Other") });

    const first = journal.findByServer(serverId, { limit: 2 });
    expect(first.map((e) => e.createdAt)).toEqual([300, 200]);

    const last = first[first.length - 1];
    const second = journal.findByServer(serverId, {
      limit: 2,
      before: { createdAt: last.createdAt, id: last.id },
    });
    expect(second.map((e) => e.createdAt)).toEqual([200, 100]);
    expect(new Set([...first, ...second].map((e) => e.id)).size).toBe(4);
  });

  test("deleteOlderThan drops old entries and counts them", () => {
    write(100);
    write(200);
    write(300);
    expect(journal.deleteOlderThan(250)).toBe(2);
    expect(
      journal.findByServer(serverId, { limit: 10 }).map((e) => e.createdAt),
    ).toEqual([300]);
  });

  test("entries outlive their user and storage but not their server", () => {
    const s3 = storages.create({
      name: "S3",
      driver: "s3",
      config: {
        endpoint: "e",
        region: "r",
        bucket: "b",
        prefix: "",
        accessKeyId: "a",
        secretAccessKey: "s",
        virtualHostedStyle: false,
      },
    }).id;
    write(100, { userId: "alice", storageId: s3 });

    users.delete("alice");
    storages.delete(s3);
    expect(journal.findByServer(serverId, { limit: 10 })[0]).toMatchObject({
      userId: null,
      username: null,
      storageId: null,
    });

    servers.delete(serverId);
    expect(journal.findByServer(serverId, { limit: 10 })).toEqual([]);
  });
});
