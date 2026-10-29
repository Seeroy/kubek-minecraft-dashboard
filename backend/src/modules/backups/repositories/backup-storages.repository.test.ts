import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import type { S3StorageConfig } from "@shared/types/backup.types";
import { BackupStoragesRepository } from "./backup-storages.repository";

let storages: BackupStoragesRepository;

const config = (extra: Partial<S3StorageConfig> = {}): S3StorageConfig => ({
  endpoint: "https://s3.example.com",
  region: "eu-central-1",
  bucket: "kubek",
  prefix: "backups/",
  accessKeyId: "AKIA",
  secretAccessKey: "secret",
  virtualHostedStyle: true,
  ...extra,
});

beforeEach(() => {
  setSystemTime(new Date(1000));
  storages = new BackupStoragesRepository(sqliteProvider(memoryDatabase()));
});

afterEach(() => {
  setSystemTime();
});

describe("BackupStoragesRepository", () => {
  test("a storage reads back with its full config", () => {
    const created = storages.create({
      name: "S3",
      driver: "s3",
      config: config(),
    });
    expect(storages.findById(created.id)).toEqual({
      id: created.id,
      name: "S3",
      driver: "s3",
      config: config(),
      createdAt: 1000,
      updatedAt: 1000,
    });
    expect(storages.findById("nope")).toBeNull();
  });

  test("storages are listed in creation order", () => {
    const a = storages.create({ name: "A", driver: "s3", config: config() });
    setSystemTime(new Date(500));
    const b = storages.create({ name: "B", driver: "s3", config: config() });
    expect(storages.findAll().map((s) => s.id)).toEqual([b.id, a.id]);
  });

  test("update replaces name and config and bumps updatedAt", () => {
    const created = storages.create({
      name: "S3",
      driver: "s3",
      config: config(),
    });
    setSystemTime(new Date(2000));
    storages.update(created.id, {
      name: "R2",
      config: config({ bucket: "other", virtualHostedStyle: false }),
    });
    expect(storages.findById(created.id)).toEqual({
      ...created,
      name: "R2",
      config: config({ bucket: "other", virtualHostedStyle: false }),
      updatedAt: 2000,
    });
  });

  test("names are unique", () => {
    storages.create({ name: "S3", driver: "s3", config: config() });
    expect(() =>
      storages.create({ name: "S3", driver: "s3", config: config() }),
    ).toThrow("UNIQUE constraint failed: backup_storages.name");
  });

  test("delete removes the storage", () => {
    const created = storages.create({
      name: "S3",
      driver: "s3",
      config: config(),
    });
    storages.delete(created.id);
    expect(storages.findAll()).toEqual([]);
  });
});
