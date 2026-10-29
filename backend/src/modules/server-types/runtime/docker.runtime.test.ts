import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { fake } from "@/testing/fake";
import { Logger } from "@nestjs/common";
import type Docker from "dockerode";
import type { Container, ContainerInspectInfo } from "dockerode";
import { DockerRuntime } from "./docker.runtime";
import type { DockerService } from "./docker.service";

const inspectInfo = (running: boolean) =>
  fake<ContainerInspectInfo>({
    Name: "/kubek-srv",
    State: fake<ContainerInspectInfo["State"]>({ Running: running }),
  });

const dockerError = (statusCode: number, message = `HTTP ${statusCode}`) =>
  Object.assign(new Error(message), { statusCode });

let warnings: string[];

beforeEach(() => {
  warnings = [];
  Logger.overrideLogger({
    log: () => {},
    error: () => {},
    warn: (message: string) => {
      warnings.push(message);
    },
  });
});

afterEach(() => {
  Logger.overrideLogger(false);
});

function runtimeWith(container: Partial<Container>) {
  const stub = fake<Container>(container);
  const docker = fake<DockerService>({
    getDocker: () => fake<Docker>({ getContainer: () => stub }),
  });
  return new DockerRuntime(docker, {
    image: "itzg/minecraft-server",
    containerName: "kubek-srv",
    binds: [],
    env: [],
    portBindings: {},
  });
}

// Adopt is the cheapest way to get a container into the runtime
async function adopted(container: Partial<Container>) {
  const runtime = runtimeWith({
    inspect: () => Promise.resolve(inspectInfo(true)),
    wait: () => new Promise(() => {}),
    logs: () => Promise.reject(dockerError(404)),
    ...container,
  });
  await runtime.adopt("abc");
  return runtime;
}

describe("DockerRuntime error handling", () => {
  test("a container that is already gone is killed quietly", async () => {
    const runtime = await adopted({
      kill: () => Promise.reject(dockerError(409, "is not running")),
      remove: () => Promise.reject(dockerError(404, "no such container")),
    });

    await runtime.kill();

    expect(warnings).toEqual([]);
  });

  test("a stop of a stopped container is quiet", async () => {
    const runtime = await adopted({
      stop: () => Promise.reject(dockerError(304)),
    });

    await runtime.stop({ type: "signal", signal: "SIGTERM" });

    expect(warnings).toEqual([]);
  });

  test("unexpected daemon errors are logged and still swallowed", async () => {
    const runtime = await adopted({
      kill: () => Promise.reject(dockerError(500, "daemon exploded")),
      remove: () => Promise.reject(new Error("socket hang up")),
    });

    await runtime.kill();

    expect(warnings).toEqual([
      "Could not kill for kubek-srv: daemon exploded",
      "Could not remove for kubek-srv: socket hang up",
    ]);
  });

  test("log errors other than not found are logged on adopt", async () => {
    await adopted({
      logs: () => Promise.reject(dockerError(500, "logs broke")),
    });

    expect(warnings).toEqual([
      "Could not read log history for kubek-srv: logs broke",
      "Could not follow logs for kubek-srv: logs broke",
    ]);
  });

  test("no old container to clean up is quiet, a failing inspect is not", async () => {
    let inspectError = dockerError(404);
    const runtime = runtimeWith({
      inspect: () => Promise.reject(inspectError),
    });
    const removeStale = () => runtime["removeStale"]();

    await removeStale();
    expect(warnings).toEqual([]);

    inspectError = dockerError(500, "daemon busy");
    await removeStale();
    expect(warnings).toEqual([
      "Could not inspect old container for kubek-srv: daemon busy",
    ]);
  });

  test("a stale container removed in the meantime is quiet", async () => {
    const runtime = runtimeWith({
      inspect: () => Promise.resolve(inspectInfo(false)),
      remove: () => Promise.reject(dockerError(404)),
    });

    await runtime["removeStale"]();

    expect(warnings).toEqual([]);
  });
});
