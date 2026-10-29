import { beforeEach, describe, expect, test } from "bun:test";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ServerInstance } from "@/modules/instances/instance";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import type { ServerInstanceFactory } from "@/modules/instances/server-instance.factory";
import type { DockerService } from "@/modules/server-types/runtime/docker.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import { ServerStatus } from "@shared/types/server/server.types";
import { ServerBootService } from "./server-boot.service";

let repo: ServersRepository;
let instances: InstancesRegistry;
let boot: ServerBootService;

const addServer = (name: string, status: ServerStatus) =>
  repo.create({
    name,
    status,
    restartOnError: { enabled: true, attempts: 3 },
    folderId: null,
    blueprintId: "test.core",
    variables: {},
    createdBy: null,
  });

beforeEach(() => {
  repo = new ServersRepository(sqliteProvider());
  instances = new InstancesRegistry();
  boot = new ServerBootService(
    repo,
    instances,
    fake<ServerInstanceFactory>(),
    fake<DockerService>({ isAvailable: () => Promise.resolve(false) }),
  );
});

describe("ServerBootService", () => {
  test("servers left running by the last process are marked stopped, crashes stay visible", () => {
    const running = addServer("running", ServerStatus.RUNNING);
    const starting = addServer("starting", ServerStatus.STARTING);
    const crashed = addServer("crashed", ServerStatus.CRASHED);

    boot.onModuleInit();

    expect(repo.findById(running.id)!.status).toBe(ServerStatus.STOPPED);
    expect(repo.findById(starting.id)!.status).toBe(ServerStatus.STOPPED);
    expect(repo.findById(crashed.id)!.status).toBe(ServerStatus.CRASHED);
  });

  test("only running native servers are stopped on shutdown", async () => {
    const stopped: string[] = [];
    const make = (id: string, running: boolean, docker: boolean) =>
      fake<ServerInstance>({
        serverId: id,
        isRunning: () => running,
        isDocker: () => docker,
        stopForShutdown: () => {
          stopped.push(id);
          return Promise.resolve(true);
        },
      });
    instances.add(make("native", true, false));
    instances.add(make("docker", true, true));
    instances.add(make("idle", false, false));

    await boot.beforeApplicationShutdown();

    expect(stopped).toEqual(["native"]);
  });
});
