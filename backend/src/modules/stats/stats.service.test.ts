import { describe, expect, test } from "bun:test";
import { sqliteProvider } from "@/testing/sqlite";
import type { CompanionInstallerService } from "../companion/install/companion-installer.service";
import type { ConfigService } from "../config/config.service";
import { RolesRepository } from "../database/repositories/roles.repository";
import { ServersRepository } from "../database/repositories/servers.repository";
import { UsersRepository } from "../database/repositories/users.repository";
import type { JavaService } from "../java/java.service";
import { StatsService } from "./stats.service";

function makeService(
  config: Record<string, unknown> = {},
  companions: Record<string, string> = {},
) {
  const provider = sqliteProvider();
  const java = {
    getInstalledJavaVersions: async () => [
      { version: "21.0.5", path: "/home/alice/.jdks/21/bin/java" },
    ],
  } as unknown as JavaService;
  const configService = {
    getAll: () => config,
    get: (key: string) => config[key],
  } as unknown as ConfigService;
  const service = new StatsService(
    java,
    new ServersRepository(provider),
    new UsersRepository(provider),
    new RolesRepository(provider),
    configService,
    provider,
    {
      detect: async (id: string) =>
        companions[id]
          ? { fileName: "KubekCompanion.jar", version: companions[id] }
          : null,
    } as unknown as CompanionInstallerService,
  );
  return { service, db: provider.connection };
}

describe("StatsService.collectStats", () => {
  test("sends Java versions without paths", async () => {
    const { service } = makeService();
    const stats = await service.collectStats();
    expect(stats.javas).toBe(JSON.stringify(["21.0.5"]));
    expect(stats.javas).not.toContain("alice");
  });

  test("counts features without settings values", async () => {
    const { service, db } = makeService({
      assistant: { enabled: true, preset: "openai", apiKey: "sk-secret" },
    });
    db.run(
      `INSERT INTO backup_storages (id, name, driver, config, createdAt, updatedAt)
       VALUES ('s1', 'My S3', 's3', '{"secret":"x"}', 0, 0)`,
    );

    const stats = await service.collectStats();
    expect(stats.features.assistant).toBe("openai");
    expect(stats.features.backups.storages).toEqual({ s3: 1 });
    expect(stats.features.scheduledTasks).toEqual({});
    expect(JSON.stringify(stats)).not.toContain("secret");
    expect(JSON.stringify(stats)).not.toContain("My S3");
  });

  test("counts servers with the companion by version", async () => {
    const { service, db } = makeService(
      {},
      { a: "1.0.0", b: "1.0.0", c: "1.1.0" },
    );
    for (const id of ["a", "b", "c", "d"]) {
      db.run(
        `INSERT INTO servers (id, name, status, restartEnabled, restartAttempts, blueprintId)
         VALUES ('${id}', '${id}', 'stopped', 0, 0, 'com.kubek.paper')`,
      );
    }
    const stats = await service.collectStats();
    expect(stats.features.companion).toEqual({
      servers: 3,
      versions: { "1.0.0": 2, "1.1.0": 1 },
    });
  });

  test("assistant is null when disabled", async () => {
    const { service } = makeService({
      assistant: { enabled: false, preset: "openai" },
    });
    expect((await service.collectStats()).features.assistant).toBeNull();
  });

  test("keeps the latest client settings per user", async () => {
    const { service } = makeService();
    service.rememberClient("u1", {
      language: "ru",
      theme: "dark",
      colorTheme: "default",
    });
    service.rememberClient("u1", {
      language: "en",
      theme: "dark",
      colorTheme: "green",
    });
    service.rememberClient("u2", {
      language: "en",
      theme: "system",
      colorTheme: "default",
    });

    const { clients } = await service.collectStats();
    expect(clients.languages).toEqual({ en: 2 });
    expect(clients.themes).toEqual({ dark: 1, system: 1 });
    expect(clients.colorThemes).toEqual({ green: 1, default: 1 });
  });
});
