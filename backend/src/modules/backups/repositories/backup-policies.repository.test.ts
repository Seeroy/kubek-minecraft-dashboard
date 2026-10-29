import { beforeEach, describe, expect, test } from "bun:test";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import type { BackupPolicy } from "@shared/types/backup.types";
import { ServerStatus } from "@shared/types/server/server.types";
import { BackupPoliciesRepository } from "./backup-policies.repository";
import { BackupStoragesRepository } from "./backup-storages.repository";

let policies: BackupPoliciesRepository;
let storages: BackupStoragesRepository;
let servers: ServersRepository;
let serverId: string;
let s3: string;

const policy = (storageId: string | null): BackupPolicy => ({
  local: { keepCount: 5, keepDays: null },
  remote: {
    storageId,
    keepCount: null,
    keepDays: 30,
    uploadMode: "auto",
    deleteLocalAfterUpload: true,
  },
});

beforeEach(() => {
  const provider = sqliteProvider(memoryDatabase());
  policies = new BackupPoliciesRepository(provider);
  storages = new BackupStoragesRepository(provider);
  servers = new ServersRepository(provider);
  serverId = servers.create({
    name: "Lobby",
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: false, attempts: 0 },
    blueprintId: "paper",
    variables: {},
  }).id;
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

describe("BackupPoliciesRepository", () => {
  test("a server without a policy has none", () => {
    expect(policies.find(serverId)).toBeNull();
  });

  test("a policy reads back as saved", () => {
    policies.upsert(serverId, policy(s3));
    expect(policies.find(serverId)).toEqual(policy(s3));
  });

  test("saving again replaces the policy", () => {
    policies.upsert(serverId, policy(s3));
    const next: BackupPolicy = {
      local: { keepCount: null, keepDays: 7 },
      remote: {
        storageId: null,
        keepCount: 3,
        keepDays: null,
        uploadMode: "manual",
        deleteLocalAfterUpload: false,
      },
    };
    policies.upsert(serverId, next);
    expect(policies.find(serverId)).toEqual(next);
  });

  test("limits must be positive", () => {
    expect(() =>
      policies.upsert(serverId, {
        ...policy(null),
        local: { keepCount: 0, keepDays: null },
      }),
    ).toThrow("CHECK constraint failed");
    expect(policies.find(serverId)).toBeNull();
  });

  test("deleting the storage turns remote uploads off", () => {
    policies.upsert(serverId, policy(s3));
    storages.delete(s3);
    expect(policies.find(serverId)?.remote.storageId).toBeNull();
  });

  test("the policy goes away with its server or on delete", () => {
    policies.upsert(serverId, policy(null));
    policies.delete(serverId);
    expect(policies.find(serverId)).toBeNull();

    policies.upsert(serverId, policy(null));
    servers.delete(serverId);
    expect(policies.find(serverId)).toBeNull();
  });
});
