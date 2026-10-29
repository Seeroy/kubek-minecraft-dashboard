import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AppEventsService } from "@/core/events/app-events.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import type {
  InstallOptions,
  InstallPipeline,
} from "@/modules/server-types/install-pipeline.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import type { TasksEventsService } from "@/ws/services/task-events.service";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import fs from "fs";
import os from "os";
import path from "path";
import { ServerCoreChanger } from "./server-core-changer";
import { CUSTOM_BLUEPRINT_ID } from "./servers.constants";
import type { ServersFactory } from "./servers.factory";

function manifest(
  id: string,
  overrides: Partial<KubekBlueprintManifest> = {},
): KubekBlueprintManifest {
  return {
    manifestVersion: 1,
    id,
    name: id,
    game: "minecraft",
    version: "3.0.0",
    runtime: { kind: "native" },
    variables: [
      { key: "GAME_VERSION", type: "string", options: { from: "versions" } },
      { key: "MEMORY", type: "number", default: 1024 },
    ],
    versions: { kind: "static", versions: [] },
    install: { steps: [] },
    startup: { command: "run", stop: { type: "command", value: "stop" } },
    query: { protocol: "none", port: { value: 0 } },
    ports: [],
    ...overrides,
  };
}

class TestRegistry extends ServerTypesRegistry {
  private readonly items = new Map<string, KubekBlueprintManifest>([
    ["purpur", manifest("purpur")],
    [
      "docker-only",
      manifest("docker-only", {
        runtime: { kind: "docker" },
        dockerProfile: { image: "img", env: {} },
      }),
    ],
    [
      CUSTOM_BLUEPRINT_ID,
      manifest(CUSTOM_BLUEPRINT_ID, {
        variables: [{ key: "MEMORY", type: "number", default: 1024 }],
        versions: { kind: "none" },
      }),
    ],
  ]);
  get(id: string): LoadedBlueprint | undefined {
    const m = this.items.get(id);
    return (
      m && { manifest: m, dir: "", source: "bundled", valid: true, errors: [] }
    );
  }
}

let cwd: string;
let root: string;
let repo: ServersRepository;
let tasks: TasksService;
let installs: { blueprintId: string; opts?: InstallOptions }[];
let installError: Error | null;
let broadcasts: number;
let changer: ServerCoreChanger;
let source: IServer;

const serverFile = (...p: string[]) =>
  path.join(root, "servers", source.id, ...p);
const jar = (name: string) =>
  fake<Express.Multer.File>({
    originalname: name,
    buffer: Buffer.from("custom jar"),
  });

beforeEach(() => {
  cwd = process.cwd();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-core-"));
  process.chdir(root);

  repo = new ServersRepository(sqliteProvider());
  installs = [];
  installError = null;
  broadcasts = 0;
  tasks = new TasksService(
    fake<TasksEventsService>({
      emitTaskUpdate: () => {},
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    }),
    fake<ExtensionEventBus>({ publish: () => {} }),
    new AppEventsService(),
  );
  changer = new ServerCoreChanger(
    tasks,
    repo,
    new TestRegistry(),
    new BlueprintResolver(),
    fake<InstallPipeline>({
      run: (blueprint, _server, _taskId, opts) => {
        installs.push({ blueprintId: blueprint.manifest.id, opts });
        return installError ? Promise.reject(installError) : Promise.resolve();
      },
    }),
    fake<ServersFactory>({
      broadcastServersList: () => {
        broadcasts++;
      },
    }),
  );

  source = repo.create({
    name: "alpha",
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: true, attempts: 3 },
    blueprintId: "paper",
    blueprintVersion: "1.0.0",
    runtimeKind: "native",
    variables: { GAME_VERSION: "1.20.1", MEMORY: 4096 },
  });
  fs.mkdirSync(path.join(root, "servers", source.id, "world"), {
    recursive: true,
  });
  fs.writeFileSync(serverFile("server.jar"), "paper jar");
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

describe("ServerCoreChanger", () => {
  test("switching keeps the variables, sets the new version and reinstalls over the files", async () => {
    const { server, taskId } = changer.changeCore(
      source,
      "purpur",
      "1.21.4",
      "u1",
    );
    const task = await tasks.waitFor(taskId);

    expect(server).toMatchObject({
      blueprintId: "purpur",
      blueprintVersion: "3.0.0",
      runtimeKind: "native",
      variables: { GAME_VERSION: "1.21.4", MEMORY: 4096 },
    });
    expect(repo.findById(source.id)?.blueprintId).toBe("purpur");
    expect(task).toMatchObject({
      type: TaskType.SERVER_CHANGE_CORE,
      status: TaskStatus.SUCCESS,
      result: { serverId: source.id },
    });
    expect(installs).toEqual([
      { blueprintId: "purpur", opts: { skipExistingFiles: true } },
    ]);
    expect(fs.existsSync(serverFile("world"))).toBe(true);
    expect(broadcasts).toBe(2);
  });

  test("a core with a version list needs a version", () => {
    expect(() => changer.changeCore(source, "purpur", undefined, "u1")).toThrow(
      "A version is required for this core",
    );
    expect(repo.findById(source.id)?.blueprintId).toBe("paper");
  });

  test("a custom core needs an uploaded jar", () => {
    expect(() =>
      changer.changeCore(source, CUSTOM_BLUEPRINT_ID, undefined, "u1"),
    ).toThrow("Custom cores require an uploaded jar file");
  });

  test("an uploaded custom jar replaces server.jar", async () => {
    const { taskId } = changer.changeCore(
      source,
      CUSTOM_BLUEPRINT_ID,
      undefined,
      "u1",
      jar("my.jar"),
    );
    await tasks.waitFor(taskId);

    expect(fs.readFileSync(serverFile("server.jar"), "utf8")).toBe(
      "custom jar",
    );
  });

  test("a native server cannot move to a docker only core", () => {
    expect(() =>
      changer.changeCore(source, "docker-only", "1.21", "u1"),
    ).toThrow("This core is docker-only");
    expect(installs).toEqual([]);
  });

  test("a server without a runtime kind is treated as native", () => {
    const legacy = { ...source, runtimeKind: undefined };
    expect(() =>
      changer.changeCore(legacy, "docker-only", "1.21", "u1"),
    ).toThrow("This core is docker-only");
  });

  test("an unknown core is refused before anything changes", () => {
    expect(() => changer.changeCore(source, "nope", "1", "u1")).toThrow(
      "Unknown or invalid blueprint: nope",
    );
    expect(tasks.getAll()).toEqual([]);
  });

  test("a failed reinstall fails the task and keeps the files", async () => {
    installError = new Error("download failed");

    const { taskId } = changer.changeCore(source, "purpur", "1.21.4", "u1");
    const task = await tasks.waitFor(taskId);

    expect(task.error).toEqual({
      code: "SERVER_CHANGE_CORE_ERROR",
      message: "download failed",
    });
    expect(fs.readFileSync(serverFile("server.jar"), "utf8")).toBe("paper jar");
    expect(repo.findById(source.id)?.blueprintId).toBe("purpur");
  });
});
