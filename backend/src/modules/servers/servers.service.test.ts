import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AppEventsService } from "@/core/events/app-events.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import type { ServerInstance } from "@/modules/instances/instance";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import type { ServerInstanceFactory } from "@/modules/instances/server-instance.factory";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import type { ServerBootService } from "@/modules/servers/server-boot.service";
import type { ServerCoreChanger } from "@/modules/servers/server-core-changer";
import type { ServersFactory } from "@/modules/servers/servers.factory";
import { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import { testUser } from "@/testing/user";
import { sqliteProvider } from "@/testing/sqlite";
import type { TasksEventsService } from "@/ws/services/task-events.service";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import { type ITask, TaskStatus } from "@shared/types/task.types";
import type { IUser } from "@shared/types/user.types";
import { hashSync } from "bcryptjs";
import fs from "fs";
import os from "os";
import path from "path";
import { ServersService } from "./servers.service";

const manifest: KubekBlueprintManifest = {
  manifestVersion: 1,
  id: "test.core",
  name: "Test core",
  game: "test",
  version: "1.0.0",
  runtime: { kind: "native" },
  variables: [
    {
      key: "MEMORY",
      label: "Memory",
      type: "number",
      default: 1024,
      rules: "min:512",
    },
    { key: "MOTD", type: "string", default: "hi" },
  ],
  versions: { kind: "none" },
  install: { steps: [] },
  startup: { command: "run", stop: { type: "command", value: "stop" } },
  query: { protocol: "none", port: { value: 0 } },
  ports: [],
};

class TestRegistry extends ServerTypesRegistry {
  get(id: string): LoadedBlueprint | undefined {
    return id === manifest.id
      ? { manifest, dir: "", source: "bundled", valid: true, errors: [] }
      : undefined;
  }
}

class FakeInstance {
  running = false;
  killed = 0;
  disposed = false;
  startResult: boolean | Error = true;
  stoppedBy?: IUser;
  constructor(readonly serverId: string) {}
  start = (): Promise<boolean> =>
    this.startResult instanceof Error
      ? Promise.reject(this.startResult)
      : Promise.resolve(this.startResult);
  stop = (byUser?: IUser): Promise<boolean> => {
    this.stoppedBy = byUser;
    return Promise.resolve(true);
  };
  restart = (): Promise<boolean> => Promise.resolve(false);
  kill = (): Promise<boolean> => {
    this.killed++;
    this.running = false;
    return Promise.resolve(true);
  };
  dispose = (): void => {
    this.disposed = true;
  };
  isRunning = () => this.running;
  getDiagnostics = () => [];
  readServerProperties = () => Promise.resolve(null);
  writeServerProperties = () => Promise.resolve(false);
}

const passwordHash = hashSync("secret", 4);

const user = (overrides: Partial<IUser> = {}): IUser =>
  testUser("u1", {
    username: "admin",
    password: passwordHash,
    isAdmin: true,
    ...overrides,
  });

let cwd: string;
let root: string;
let repo: ServersRepository;
let instances: InstancesRegistry;
let created: FakeInstance[];
let tasks: TasksService;
let service: ServersService;

function addServer(name: string, status = ServerStatus.STOPPED): IServer {
  const server = repo.create({
    name,
    status,
    restartOnError: { enabled: true, attempts: 3 },
    folderId: null,
    blueprintId: manifest.id,
    variables: { MEMORY: 2048, MOTD: "hello" },
    createdBy: null,
  });
  const dir = path.join(root, "servers", server.id);
  fs.mkdirSync(path.join(dir, "world"), { recursive: true });
  fs.writeFileSync(path.join(dir, "world", "level.dat"), "data");
  return server;
}

const lastTask = (): ITask => tasks.getAll().at(-1)!;

beforeEach(() => {
  cwd = process.cwd();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-servers-"));
  process.chdir(root);

  repo = new ServersRepository(sqliteProvider());
  instances = new InstancesRegistry();
  created = [];
  tasks = new TasksService(
    fake<TasksEventsService>({
      emitTaskUpdate: () => {},
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    }),
    fake<ExtensionEventBus>({ publish: () => {} }),
    new AppEventsService(),
  );

  service = new ServersService(
    repo,
    instances,
    fake<ServerInstanceFactory>({
      create: (server) => {
        const instance = new FakeInstance(server.id);
        created.push(instance);
        return fake<ServerInstance>(instance);
      },
    }),
    fake<ServersFactory>({}),
    fake<ServerCoreChanger>({
      changeCore: (server) => ({ server, taskId: "core-task" }),
    }),
    tasks,
    new TestRegistry(),
    new BlueprintResolver(),
    fake<ServerBootService>({ containersReady: Promise.resolve() }),
  );
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

describe("ServersService start, stop and kill", () => {
  test("a successful start finishes its task with the server id", async () => {
    const server = addServer("alpha");

    await service.start(server.id, "u1");

    expect(lastTask()).toMatchObject({
      status: TaskStatus.SUCCESS,
      ownerId: "u1",
      result: { serverId: server.id },
      meta: { serverId: server.id, serverName: "alpha" },
    });
  });

  test("a start the instance refuses fails the task with START_FAILED", async () => {
    const server = addServer("alpha");
    instances.add(
      fake<ServerInstance>(
        Object.assign(new FakeInstance(server.id), { startResult: false }),
      ),
    );

    await service.start(server.id);

    expect(lastTask().status).toBe(TaskStatus.FAILED);
    expect(lastTask().error).toEqual({
      code: "START_FAILED",
      message: "Failed to start",
    });
  });

  test("a start that throws fails the task and rethrows", async () => {
    const server = addServer("alpha");
    const instance = new FakeInstance(server.id);
    instance.startResult = new Error("port in use");
    instances.add(fake<ServerInstance>(instance));

    await expect(service.start(server.id)).rejects.toThrow("port in use");
    await tasks.waitFor(lastTask().id);

    expect(lastTask().error).toEqual({
      code: "START_FAILED_ERROR",
      message: "port in use",
    });
  });

  test("starting an unknown server is a not found without a task", async () => {
    await expect(service.start("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tasks.getAll()).toEqual([]);
  });

  test("the instance is created once and reused across operations", async () => {
    const server = addServer("alpha");

    await service.start(server.id);
    await service.stop(server.id, user());
    await service.kill(server.id);

    expect(created).toHaveLength(1);
    expect(created[0].stoppedBy?.id).toBe("u1");
    expect(created[0].killed).toBe(1);
  });

  test("a restart the instance refuses fails with RESTART_FAILED", async () => {
    const server = addServer("alpha");

    await service.restart(server.id, user());

    expect(lastTask().error?.code).toBe("RESTART_FAILED");
  });

  test.each(["stop", "restart", "kill"] as const)(
    "%s of an unknown server is a not found",
    async (op) => {
      const call =
        op === "kill"
          ? service.kill("missing")
          : service[op]("missing", user());
      await expect(call).rejects.toBeInstanceOf(NotFoundException);
    },
  );
});

describe("ServersService properties and diagnostics", () => {
  test("missing server.properties is a not found", async () => {
    const server = addServer("alpha");
    await expect(service.getServerProperties(server.id)).rejects.toThrow(
      "Server properties file not found",
    );
  });

  test("a failed properties write is a bad request", async () => {
    const server = addServer("alpha");
    await expect(
      service.saveServerProperties(server.id, { motd: "x" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test("an instance of an unknown server is not found", () => {
    expect(() => service.getInstance("missing")).toThrow(NotFoundException);
  });

  test("diagnostics are empty until an instance exists", () => {
    const server = addServer("alpha");
    expect(service.getDiagnostics(server.id)).toEqual([]);
    expect(() => service.getDiagnostics("missing")).toThrow(NotFoundException);
  });
});

describe("ServersService settings", () => {
  test("renaming and restart settings are saved", async () => {
    const server = addServer("alpha");

    const updated = await service.updateServerSettings(server.id, {
      name: "beta",
      restartOnError: { enabled: false, attempts: 1 },
    });

    expect(updated.name).toBe("beta");
    expect(repo.findById(server.id)!.restartOnError).toEqual({
      enabled: false,
      attempts: 1,
    });
  });

  test("renaming to a name another server has is refused", async () => {
    const server = addServer("alpha");
    addServer("beta");

    await expect(
      service.updateServerSettings(server.id, { name: "beta" }),
    ).rejects.toThrow("NAME_TAKEN");
    expect(repo.findById(server.id)!.name).toBe("alpha");
    expect(
      (await service.updateServerSettings(server.id, { name: "alpha" })).name,
    ).toBe("alpha");
  });

  test("variables are merged over the current ones and coerced by the blueprint", async () => {
    const server = addServer("alpha");

    const updated = await service.updateServerSettings(server.id, {
      variables: { MEMORY: "4096" },
    });

    expect(updated.variables).toEqual({ MEMORY: 4096, MOTD: "hello" });
  });

  test("variables breaking a blueprint rule are rejected and nothing is saved", async () => {
    const server = addServer("alpha");

    await expect(
      service.updateServerSettings(server.id, { variables: { MEMORY: 100 } }),
    ).rejects.toThrow("Variable MEMORY must be >= 512");
    expect(repo.findById(server.id)!.variables.MEMORY).toBe(2048);
  });

  test("variables of a server whose blueprint is gone are rejected", async () => {
    const server = addServer("alpha");
    repo.update(server.id, { blueprintId: "gone" });

    await expect(
      service.updateServerSettings(server.id, { variables: { MEMORY: 600 } }),
    ).rejects.toThrow("Server blueprint not found");
  });

  test("variable labels fall back to the key", () => {
    const server = addServer("alpha");
    expect(service.variableLabels(server)).toEqual({
      "variables.MEMORY": "Memory",
      "variables.MOTD": "MOTD",
    });
  });
});

describe("ServersService core change", () => {
  test("a running server cannot change its core", () => {
    const server = addServer("alpha", ServerStatus.RUNNING);
    expect(() =>
      service.changeCore(server.id, { blueprintId: manifest.id }),
    ).toThrow("Stop the server before changing its core");
  });

  test("a crashed server can change its core and its cached instance is dropped", async () => {
    const server = addServer("alpha", ServerStatus.CRASHED);
    await service.kill(server.id);

    const result = service.changeCore(server.id, { blueprintId: manifest.id });

    expect(result.taskId).toBe("core-task");
    expect(instances.getByServerId(server.id)).toBeNull();
    expect(created[0].disposed).toBe(true);
  });
});
