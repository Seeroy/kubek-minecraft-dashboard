import { describe, expect, test } from "bun:test";
import type { ServerModsRepository } from "@/modules/database/repositories/server-mods.repository";
import type { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ModrinthClient } from "@/modules/modrinth/modrinth-client.service";
import type { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import type { IServer } from "@shared/types/server/server.types";
import { ModsService } from "./mods.service";

function service(blueprintId: string, loaders: string[]) {
  const server = fake<IServer>({ id: "s1", name: "s1", blueprintId });
  return new ModsService(
    fake<ServersRepository>({ findById: () => server }),
    fake<ServerModsRepository>({ findByServer: () => [] }),
    fake<TasksService>({ createTask: () => "t1", updateTask: () => null }),
    fake<ServerTypesRegistry>({
      get: () => ({ manifest: { features: ["mods:fabric"] } }) as never,
    }),
    fake<ModrinthClient>({
      getProject: () => Promise.resolve({ id: "p1", title: "Thing" } as never),
      getVersion: () =>
        Promise.resolve({
          id: "v1",
          project_id: "p1",
          version_number: "1.0",
          loaders,
          dependencies: [],
          files: [],
        } as never),
    }),
  );
}

const install = (mods: ModsService) =>
  mods.installPlugin("u1", {
    serverId: "s1",
    projectId: "p1",
    versionId: "v1",
  });

describe("ModsService loaders", () => {
  test("a Paper plugin can't go into mods of a Quilt server", async () => {
    await expect(
      install(service("com.kubek.quilt", ["paper", "spigot"])),
    ).rejects.toThrow("runs on paper, spigot");
  });

  test("Quilt takes Quilt and Fabric mods", async () => {
    expect(await install(service("com.kubek.quilt", ["quilt"]))).toEqual({
      taskId: "t1",
    });
    expect(await install(service("com.kubek.quilt", ["fabric"]))).toEqual({
      taskId: "t1",
    });
  });

  test("Fabric doesn't take Quilt only mods", async () => {
    await expect(
      install(service("com.kubek.fabric", ["quilt"])),
    ).rejects.toThrow("this server takes fabric");
  });
});
