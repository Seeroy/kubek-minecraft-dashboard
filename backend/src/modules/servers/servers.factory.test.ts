import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AppEventsService } from "@/core/events/app-events.service";
import { ConfigService } from "@/modules/config/config.service";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import type { InstallPipeline } from "@/modules/server-types/install-pipeline.service";
import type { DockerService } from "@/modules/server-types/runtime/docker.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import type { ServerEventsService } from "@/ws/services/server-events.service";
import type { TasksEventsService } from "@/ws/services/task-events.service";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { BadRequestException } from "@nestjs/common";
import {
  type IServer,
  type NewServerProps,
  ServerStatus,
} from "@shared/types/server/server.types";
import { TaskStatus, TaskSteps, TaskType } from "@shared/types/task.types";
import fs from "fs";
import os from "os";
import path from "path";
import {
  type CreateServerOptions,
  ServersFactory,
  writeCustomCore,
} from "./servers.factory";

function manifest(
  overrides: Partial<KubekBlueprintManifest> = {},
): KubekBlueprintManifest {
  return {
    manifestVersion: 1,
    id: "test.core",
    name: "Test core",
    game: "test",
    version: "2.0.0",
    runtime: { kind: "native" },
    variables: [
      { key: "MEMORY", type: "number", default: 1024, rules: "min:512" },
      { key: "EULA", type: "boolean", rules: "accepted" },
    ],
    versions: { kind: "none" },
    install: { steps: [] },
    startup: { command: "run", stop: { type: "command", value: "stop" } },
    query: { protocol: "none", port: { value: 0 } },
    ports: [{ key: "game", default: 25565, protocol: "tcp" }],
    ...overrides,
  };
}

class TestRegistry extends ServerTypesRegistry {
  readonly items = new Map<string, LoadedBlueprint>();
  add(m: KubekBlueprintManifest, valid = true): void {
    this.items.set(m.id, {
      manifest: m,
      dir: "",
      source: "bundled",
      valid,
      errors: [],
    });
  }
  get(id: string): LoadedBlueprint | undefined {
    return this.items.get(id);
  }
}

let cwd: string;
let root: string;
let repo: ServersRepository;
let config: ConfigService;
let registry: TestRegistry;
let tasks: TasksService;
let dockerUp: boolean;
let broadcastLists: IServer[][];
let install: (server: IServer) => Promise<void>;
let factory: ServersFactory;

const serverDir = (id: string) => path.join(root, "servers", id);
const props: NewServerProps = {
  name: "alpha",
  blueprintId: "test.core",
  variables: { EULA: true },
};
const jar = (name: string) =>
  fake<Express.Multer.File>({ originalname: name, buffer: Buffer.from("jar") });

beforeEach(() => {
  cwd = process.cwd();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-factory-"));
  process.chdir(root);

  const db = sqliteProvider();
  repo = new ServersRepository(db);
  config = new ConfigService(new ConfigRepository(db));
  registry = new TestRegistry();
  registry.add(manifest());
  dockerUp = false;
  broadcastLists = [];
  install = (server) => {
    fs.writeFileSync(path.join(serverDir(server.id), "server.jar"), "core");
    return Promise.resolve();
  };
  tasks = new TasksService(
    fake<TasksEventsService>({
      emitTaskUpdate: () => {},
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    }),
    fake<ExtensionEventBus>({ publish: () => {} }),
    new AppEventsService(),
  );

  factory = new ServersFactory(
    tasks,
    repo,
    fake<ServerEventsService>({
      emitServerList: (servers) => {
        broadcastLists.push(servers);
      },
    }),
    registry,
    new BlueprintResolver(),
    fake<InstallPipeline>({
      run: (_blueprint, server) => {
        fs.mkdirSync(serverDir(server.id), { recursive: true });
        return install(server);
      },
    }),
    config,
    fake<DockerService>({ available: () => dockerUp }),
  );
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

// Resolves after the background creation fully settled
function create(
  input: NewServerProps = props,
  file?: Express.Multer.File,
  options: CreateServerOptions = {},
) {
  let settled!: () => void;
  const done = new Promise<void>((resolve) => (settled = resolve));
  const result = factory.prepareServerDataAndCreateServer(input, "u1", file, {
    ...options,
    onSettled: settled,
  });
  return { ...result, done, task: () => tasks.getTask(result.taskId)! };
}

describe("ServersFactory create", () => {
  test("a new server gets a stopped row with validated variables and its own folder", async () => {
    const { server, done, task } = create();
    await done;

    expect(repo.findById(server.id)).toEqual({
      id: server.id,
      name: "alpha",
      status: ServerStatus.STOPPED,
      restartOnError: { enabled: true, attempts: 3 },
      folderId: null,
      blueprintId: "test.core",
      blueprintVersion: "2.0.0",
      variables: { MEMORY: 1024, EULA: true, game: 25565 },
      runtimeKind: "native",
      createdBy: null,
    });
    expect(
      fs.readFileSync(path.join(serverDir(server.id), "server.jar"), "utf8"),
    ).toBe("core");
    expect(task()).toMatchObject({
      type: TaskType.SERVER_CREATE,
      status: TaskStatus.SUCCESS,
      step: TaskSteps.COMPLETED,
      progress: 100,
      result: { serverId: server.id },
    });
    expect(broadcastLists.at(-1)?.map((s) => s.name)).toEqual(["alpha"]);
  });

  test("the task type can be overridden", async () => {
    const { done, task } = create(props, undefined, {
      taskType: TaskType.SERVER_IMPORT,
    });
    await done;
    expect(task().type).toBe(TaskType.SERVER_IMPORT);
  });

  test("an unknown blueprint is refused before anything is created", () => {
    expect(() => create({ ...props, blueprintId: "nope" })).toThrow(
      "Unknown or invalid blueprint: nope",
    );
    expect(repo.findAll()).toEqual([]);
    expect(tasks.getAll()).toEqual([]);
  });

  test("variables breaking the blueprint rules are refused before anything is created", () => {
    expect(() => create({ ...props, variables: { EULA: false } })).toThrow(
      "Variable EULA must be accepted",
    );
    expect(() =>
      create({ ...props, variables: { EULA: true, MEMORY: 64 } }),
    ).toThrow(BadRequestException);
    expect(repo.findAll()).toEqual([]);
  });

  test("a taken name is refused before a task or folder exists", async () => {
    const first = create();
    await first.done;

    expect(() => create()).toThrow("NAME_TAKEN");
    expect(repo.findAll()).toHaveLength(1);
    expect(tasks.getAll()).toHaveLength(1);
    expect(fs.readdirSync(path.join(root, "servers"))).toEqual([
      first.server.id,
    ]);
  });

  test("a failed install removes the folder and the row so the name is free again", async () => {
    install = (server) => {
      fs.writeFileSync(path.join(serverDir(server.id), "half.jar"), "x");
      return Promise.reject(new Error("download failed"));
    };
    const { server, done, task } = create();
    await done;

    expect(fs.existsSync(serverDir(server.id))).toBe(false);
    expect(repo.findById(server.id)).toBeNull();
    expect(task()).toMatchObject({
      status: TaskStatus.FAILED,
      step: TaskSteps.FAILED,
      error: { code: "SERVER_CREATE_ERROR", message: "download failed" },
    });
    expect(broadcastLists.at(-1)).toEqual([]);

    install = () => Promise.resolve();
    const retry = create();
    await retry.done;
    expect(retry.task().status).toBe(TaskStatus.SUCCESS);
  });

  test("a failing afterInstall rolls the server back too", async () => {
    const { server, done, task } = create(props, undefined, {
      afterInstall: () => Promise.reject(new Error("mods failed")),
    });
    await done;

    expect(repo.findById(server.id)).toBeNull();
    expect(fs.existsSync(serverDir(server.id))).toBe(false);
    expect(task().error?.message).toBe("mods failed");
  });

  test("afterInstall sees the installed server", async () => {
    let seen: string[] = [];
    const { done, task } = create(props, undefined, {
      afterInstall: (server) => {
        seen = fs.readdirSync(serverDir(server.id));
        return Promise.resolve();
      },
    });
    await done;

    expect(seen).toEqual(["server.jar"]);
    expect(task().status).toBe(TaskStatus.SUCCESS);
  });
});

describe("ServersFactory custom core", () => {
  test("an uploaded jar is in place before the install runs", async () => {
    let present = "";
    install = (server) => {
      present = fs.readFileSync(
        path.join(serverDir(server.id), "server.jar"),
        "utf8",
      );
      return Promise.resolve();
    };
    const { done } = create(props, jar("Paper-1.21.JAR"));
    await done;

    expect(present).toBe("jar");
  });

  test("a non jar upload fails the task and rolls back", async () => {
    const { server, done, task } = create(props, jar("core.zip"));
    await done;

    expect(task().error?.message).toBe("Custom core must be a .jar file");
    expect(repo.findById(server.id)).toBeNull();
  });

  test("writeCustomCore treats a nameless upload as a jar", () => {
    writeCustomCore("srv", jar(""));
    expect(
      fs.readFileSync(path.join(serverDir("srv"), "server.jar"), "utf8"),
    ).toBe("jar");
  });
});

describe("ServersFactory runtime choice", () => {
  const withProfile = (overrides: Partial<KubekBlueprintManifest> = {}) =>
    manifest({
      id: "dual.core",
      dockerProfile: { image: "img", env: {} },
      ...overrides,
    });

  const runtimeOf = async (input: NewServerProps) => {
    const { server, done } = create(input);
    await done;
    return server.runtimeKind;
  };

  test("auto picks docker when the core has a profile and the daemon is up", async () => {
    registry.add(withProfile());
    dockerUp = true;
    expect(await runtimeOf({ ...props, blueprintId: "dual.core" })).toBe(
      "docker",
    );
  });

  test("auto falls back to native when the daemon is down", async () => {
    registry.add(withProfile());
    expect(await runtimeOf({ ...props, blueprintId: "dual.core" })).toBe(
      "native",
    );
  });

  test("an explicit native override beats the docker setting", async () => {
    registry.add(withProfile());
    dockerUp = true;
    config.set("serverRuntime", "docker");
    expect(
      await runtimeOf({
        ...props,
        blueprintId: "dual.core",
        runtime: "native",
      }),
    ).toBe("native");
  });

  test("the native setting keeps a dual core native", async () => {
    registry.add(withProfile());
    dockerUp = true;
    config.set("serverRuntime", "native");
    expect(await runtimeOf({ ...props, blueprintId: "dual.core" })).toBe(
      "native",
    );
  });

  test("asking for docker on a core without a profile is refused", () => {
    expect(() => create({ ...props, runtime: "docker" })).toThrow(
      "Docker was requested but this core has no docker profile",
    );
    config.set("serverRuntime", "docker");
    expect(() => create(props)).toThrow(
      "serverRuntime is docker but this core has no docker profile",
    );
    expect(repo.findAll()).toEqual([]);
  });

  test("a docker only core needs a reachable daemon even with a native override", () => {
    registry.add(withProfile({ runtime: { kind: "docker" } }));
    expect(() =>
      create({ ...props, blueprintId: "dual.core", runtime: "native" }),
    ).toThrow("This core requires Docker but the daemon is not reachable");
  });
});

describe("ServersFactory discardCreated", () => {
  test("a row without a folder is still removed", () => {
    const server = repo.create({
      name: "ghost",
      status: ServerStatus.STOPPED,
      restartOnError: { enabled: true, attempts: 3 },
      blueprintId: "test.core",
      variables: {},
    });

    factory.discardCreated(server.id);

    expect(repo.findById(server.id)).toBeNull();
    expect(broadcastLists.at(-1)).toEqual([]);
  });
});
