import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import type { ServerLocksService } from "@/core/locks/server-locks.service";
import type { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ErrorRecognizerService } from "@/modules/error-recognition/error-recognizer.service";
import type { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import type { QueryRegistry } from "@/modules/server-types/query-protocols/query-registry.service";
import type { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { ServerEventsService } from "@/ws/services/server-events.service";
import type { DockerRuntime } from "@/modules/server-types/runtime/docker.runtime";
import type { IServerRuntime } from "@/modules/server-types/runtime/runtime.interface";
import { fake } from "@/testing/fake";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import { ServerInstance, type ServerInstanceDeps } from "./instance";
import type { LaunchCommandBuilder } from "./launch-command-builder";

/** Runtime that runs until the test kills it */
class FakeRuntime implements IServerRuntime {
  running = false;
  private exitCb?: (code: number | null) => void;
  start(): Promise<void> {
    this.running = true;
    return Promise.resolve();
  }
  stop(): Promise<void> {
    return Promise.resolve();
  }
  kill(): Promise<void> {
    this.exit(137);
    return Promise.resolve();
  }
  writeStdin(): boolean {
    return true;
  }
  onStdout(): void {}
  onExit(cb: (code: number | null) => void): void {
    this.exitCb = cb;
  }
  isRunning(): boolean {
    return this.running;
  }
  exit(code: number | null): void {
    this.running = false;
    this.exitCb?.(code);
  }
}

const DELAY = 20;
const wait = () => new Promise((r) => setTimeout(r, DELAY * 4));

let row: IServer;
let runtimes: FakeRuntime[];
let log: IInstanceLog[];

function makeInstance(restartOnError: IServer["restartOnError"]) {
  row = {
    id: "srv",
    name: "srv",
    status: ServerStatus.STOPPED,
    restartOnError,
    blueprintId: "",
    runtimeKind: "docker",
    variables: {},
  };
  runtimes = [];
  log = [];

  const noop = () => {};
  const deps: ServerInstanceDeps = {
    serverEventsService: new Proxy(fake<ServerEventsService>(), {
      get: (_t, name) =>
        name === "emitServerLog"
          ? (_id: string, entry: IInstanceLog) => log.push(entry)
          : noop,
    }),
    errorRecognizerService: fake<ErrorRecognizerService>({
      recognizeError: () => null,
    }),
    serversRepo: fake<ServersRepository>({
      findById: (id) => (id === row.id ? row : null),
      update: (_id, data) => (row = { ...row, ...data }),
    }),
    blueprintRegistry: fake<ServerTypesRegistry>({ get: () => undefined }),
    queryRegistry: fake<QueryRegistry>({ get: () => null }),
    blueprintResolver: fake<BlueprintResolver>(),
    locks: fake<ServerLocksService>({ holder: () => null }),
    launcher: fake<LaunchCommandBuilder>({
      scope: () => ({}),
      dockerCommand: () => "",
      dockerRuntime: () => {
        const runtime = new FakeRuntime();
        runtimes.push(runtime);
        // instance keeps it as IServerRuntime, DockerRuntime has private fields
        return Promise.resolve(runtime as unknown as DockerRuntime);
      },
      stopMethod: () => ({ type: "signal", signal: "SIGTERM" }),
    }),
  };
  return new ServerInstance(deps, row, row.id);
}

const restartFailures = () =>
  log.filter((l) => l.type === "kubek" && l.data?.type === "restart_failed");

describe("ServerInstance restartOnError", () => {
  let original: number;
  beforeAll(() => {
    original = ServerInstance.crashRestartDelayMs;
    ServerInstance.crashRestartDelayMs = DELAY;
  });
  afterAll(() => {
    ServerInstance.crashRestartDelayMs = original;
  });
  beforeEach(() => {
    runtimes = [];
  });

  test("starts a crashed server again", async () => {
    const instance = makeInstance({ enabled: true, attempts: 3 });
    await instance.start();
    runtimes[0].exit(2);
    expect(row.status).toBe(ServerStatus.CRASHED);

    await wait();
    expect(runtimes).toHaveLength(2);
    expect(instance.isRunning()).toBe(true);
    expect(row.status).toBe(ServerStatus.STARTING);
  });

  test("gives up after the configured attempts in a row", async () => {
    const instance = makeInstance({ enabled: true, attempts: 2 });
    await instance.start();
    for (let i = 0; i < 3; i++) {
      runtimes[runtimes.length - 1].exit(1337);
      await wait();
    }
    // Start plus two restarts, the third crash stays
    expect(runtimes).toHaveLength(3);
    expect(instance.isRunning()).toBe(false);
    expect(restartFailures()).toHaveLength(1);
    expect(row.status).toBe(ServerStatus.CRASHED);
  });

  test("a server that came up gets its attempts back", async () => {
    const instance = makeInstance({ enabled: true, attempts: 1 });
    await instance.start();
    for (let i = 0; i < 3; i++) {
      // "Done" line makes it RUNNING
      instance["onData"]("[Server] Done (1.0s)! For help, type help\n");
      expect(row.status).toBe(ServerStatus.RUNNING);
      runtimes[runtimes.length - 1].exit(2);
      await wait();
    }
    expect(runtimes).toHaveLength(4);
    expect(restartFailures()).toHaveLength(0);
  });

  test("does nothing when restartOnError is off", async () => {
    const instance = makeInstance({ enabled: false, attempts: 3 });
    await instance.start();
    runtimes[0].exit(2);
    await wait();
    expect(runtimes).toHaveLength(1);
  });

  test("an exit asked for by stop or kill is not restarted", async () => {
    const instance = makeInstance({ enabled: true, attempts: 3 });
    await instance.start();
    const stopped = instance.stop();
    runtimes[0].exit(143);
    await stopped;
    await wait();
    expect(runtimes).toHaveLength(1);

    await instance.start();
    await instance.kill();
    await wait();
    expect(runtimes).toHaveLength(2);
  });

  test("no restart on panel shutdown", async () => {
    const instance = makeInstance({ enabled: true, attempts: 3 });
    await instance.start();
    void instance.stopForShutdown();
    runtimes[0].exit(2);
    await wait();
    expect(runtimes).toHaveLength(1);
  });

  test("a disposed or deleted server stays down", async () => {
    const instance = makeInstance({ enabled: true, attempts: 3 });
    await instance.start();
    runtimes[0].exit(2);
    instance.dispose();
    await wait();
    expect(runtimes).toHaveLength(1);

    const other = makeInstance({ enabled: true, attempts: 3 });
    await other.start();
    runtimes[0].exit(2);
    row = { ...row, id: "gone" };
    await wait();
    expect(runtimes).toHaveLength(1);
  });

  test("a manual start in the grace period wins", async () => {
    const instance = makeInstance({ enabled: true, attempts: 3 });
    await instance.start();
    runtimes[0].exit(2);
    await instance.start();
    await wait();
    expect(runtimes).toHaveLength(2);
  });
});
