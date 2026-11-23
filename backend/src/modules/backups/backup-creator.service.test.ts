import { describe, expect, test } from "bun:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ServerLocksService } from "@/core/locks/server-locks.service";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import type { ServersService } from "@/modules/servers/servers.service";
import type { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import { BackupType } from "@shared/types/backup.types";
import type { IServer } from "@shared/types/server/server.types";
import type { LocalBackupStore } from "./archive/local-store";
import { BackupCreatorService } from "./backup-creator.service";
import type { BackupCopiesService } from "./copies/backup-copies.service";
import type { CreateBackupDto } from "./dto/create-backup.dto";
import type { BackupOperations } from "./journal/backup-operations";
import type { BackupPolicyService } from "./policy/backup-policy.service";
import type { BackupsRepository } from "./repositories/backups.repository";
import type { BackupRetentionService } from "./retention/backup-retention.service";
import type { BackupTransferService } from "./storage/backup-transfer.service";
import type { WorldSaveService } from "./world-save.service";

// Only the checks before anything is written
function creator(known: string[]): BackupCreatorService {
  const servers = fake<ServersService>({
    findById: (id) => (known.includes(id) ? fake<IServer>({ id }) : null),
  });
  return new BackupCreatorService(
    fake<BackupsRepository>(),
    fake<BackupCopiesService>(),
    fake<LocalBackupStore>(),
    fake<WorldSaveService>(),
    fake<BackupTransferService>(),
    fake<BackupRetentionService>(),
    fake<BackupPolicyService>(),
    fake<BackupOperations>(),
    fake<TasksService>(),
    servers,
    fake<ServerLocksService>(),
    fake<ExtensionEventBus>(),
  );
}

const dto = (serverId: string) =>
  fake<CreateBackupDto>({ name: "b", type: BackupType.FULL, serverId });

describe("backup create server id", () => {
  test.each(["..", "../..", "../servers", "unknown"])(
    "refuses %p",
    (serverId) => {
      let caught: unknown;
      try {
        creator([]).create(dto(serverId), "u");
      } catch (err) {
        caught = err;
      }
      expect(
        caught instanceof NotFoundException ||
          caught instanceof BadRequestException,
      ).toBe(true);
    },
  );

  test("a known id with traversal is still refused", () => {
    expect(() => creator([".."]).create(dto(".."), "u")).toThrow(
      BadRequestException,
    );
  });
});

describe("backup.created for extensions", () => {
  function runner(track: () => Promise<number>) {
    const published: unknown[] = [];
    const service = new BackupCreatorService(
      fake<BackupsRepository>({ update: () => {} }),
      fake<BackupCopiesService>(),
      fake<LocalBackupStore>(),
      fake<WorldSaveService>(),
      fake<BackupTransferService>(),
      fake<BackupRetentionService>({ apply: async () => {} }),
      fake<BackupPolicyService>({
        forServer: () => ({ remote: {} }) as never,
      }),
      fake<BackupOperations>({ track: track as never }),
      fake<TasksService>(),
      fake<ServersService>(),
      fake<ServerLocksService>(),
      fake<ExtensionEventBus>({
        publish: (event: string, payload: unknown) => {
          published.push({ event, payload });
        },
      }),
    );
    const run = (service as unknown as {
      run: (record: unknown, actor: unknown, progress: () => void) => Promise<void>;
    }).run.bind(service);
    const record = { id: "b1", serverId: "s1", name: "b" };
    return { published, go: () => run(record, { trigger: "user", userId: null }, () => {}) };
  }

  test("fires once the archive is done", async () => {
    const { published, go } = runner(async () => 1);
    await go();
    expect(published).toEqual([
      { event: "backup.created", payload: { serverId: "s1", backupId: "b1" } },
    ]);
  });

  test("a failed backup fires nothing", async () => {
    const { published, go } = runner(async () => {
      throw new Error("disk full");
    });
    await expect(go()).rejects.toThrow();
    expect(published).toEqual([]);
  });
});
