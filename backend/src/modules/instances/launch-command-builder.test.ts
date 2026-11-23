import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { NetworksRepository } from "@/modules/database/repositories/networks.repository";
import type { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { JavaService } from "@/modules/java/java.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import type { DockerRuntimeOptions } from "@/modules/server-types/runtime/docker.runtime";
import type { DockerService } from "@/modules/server-types/runtime/docker.service";
import { fake } from "@/testing/fake";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import type { IServer } from "@shared/types/server/server.types";
import fs from "fs";
import os from "os";
import path from "path";
import {
  LaunchCommandBuilder,
  type LaunchCommandBuilderDeps,
  type LaunchTarget,
} from "./launch-command-builder";

const builder = new LaunchCommandBuilder({} as LaunchCommandBuilderDeps);

const target = (
  stop: unknown,
  runtimeKind: IServer["runtimeKind"] = "native",
) => ({
  serverId: "s1",
  config: { runtimeKind } as IServer,
  blueprint: { startup: { stop } } as unknown as KubekBlueprintManifest,
});

describe("LaunchCommandBuilder.stopMethod", () => {
  test("passes the blueprint stop timeout along", () => {
    expect(
      builder.stopMethod(
        target({ type: "command", value: "exit", timeoutSec: 10 }),
      ),
    ).toEqual({ type: "command", value: "exit", timeoutSec: 10 });
    expect(
      builder.stopMethod(target({ type: "signal:SIGTERM", timeoutSec: 5 })),
    ).toEqual({ type: "signal", signal: "SIGTERM", timeoutSec: 5 });
  });

  test("leaves the panel default when the timeout is missing or bad", () => {
    expect(
      builder.stopMethod(target({ type: "command", value: "stop" })).timeoutSec,
    ).toBeUndefined();
    expect(
      builder.stopMethod(
        target({ type: "command", value: "stop", timeoutSec: "10" }),
      ).timeoutSec,
    ).toBeUndefined();
  });
});

describe("LaunchCommandBuilder.stopMethod fallback", () => {
  test("an unknown stop type gets SIGTERM with the timeout, not an instant kill", () => {
    expect(
      builder.stopMethod(target({ type: "magic", timeoutSec: 7 })),
    ).toEqual({ type: "signal", signal: "SIGTERM", timeoutSec: 7 });
  });
});

describe("LaunchCommandBuilder.stopMethod rcon", () => {
  const resolver = new BlueprintResolver();
  const rconBuilder = new LaunchCommandBuilder({
    blueprintResolver: resolver,
  } as unknown as LaunchCommandBuilderDeps);
  const blueprint = (stop: unknown) =>
    ({
      variables: [
        { key: "RCON_PORT", type: "number", default: 25575 },
        { key: "RCON_PASSWORD", type: "secret", default: "" },
      ],
      ports: [],
      startup: { stop },
    }) as unknown as KubekBlueprintManifest;

  test("port and password come from the server variables", () => {
    const plan = rconBuilder.stopMethod({
      serverId: "s1",
      config: { runtimeKind: "native", name: "x", variables: { RCON_PASSWORD: "pw" } } as unknown as IServer,
      blueprint: blueprint({
        type: "rcon",
        command: "Shutdown 1",
        port: { fromVariable: "RCON_PORT" },
        password: { fromVariable: "RCON_PASSWORD" },
        timeoutSec: 30,
      }),
    });
    expect(plan).toEqual({
      type: "rcon",
      command: "Shutdown 1",
      host: "127.0.0.1",
      port: 25575,
      password: "pw",
      timeoutSec: 30,
    });
  });
});

describe("LaunchCommandBuilder launch details", () => {
  let cwd: string;
  let root: string;
  let profileUsable: boolean;
  let real: LaunchCommandBuilder;

  const manifest = (
    overrides: Partial<KubekBlueprintManifest> = {},
  ): KubekBlueprintManifest => ({
    manifestVersion: 1,
    id: "test.core",
    name: "Test",
    game: "test",
    version: "1.0.0",
    runtime: { kind: "native" },
    variables: [
      { key: "MOTD", type: "string", default: "hi", env: "SERVER_MOTD" },
      { key: "EMPTY", type: "string" },
    ],
    versions: { kind: "none" },
    install: { steps: [] },
    startup: { command: "./run", stop: { type: "command", value: "stop" } },
    query: { protocol: "none", port: { value: 0 } },
    ports: [
      { key: "game", default: 25565, protocol: "tcp", env: "GAME_PORT" },
      { key: "rcon", default: 25575, protocol: "tcp" },
    ],
    ...overrides,
  });

  const launch = (
    bp: KubekBlueprintManifest,
    variables = {},
  ): LaunchTarget => ({
    serverId: "srv",
    config: { name: "My server", variables } as IServer,
    blueprint: bp,
  });

  beforeEach(() => {
    cwd = process.cwd();
    root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-launch-"));
    process.chdir(root);
    fs.mkdirSync(path.join("servers", "srv"), { recursive: true });
    profileUsable = true;
    real = new LaunchCommandBuilder({
      javaService: fake<JavaService>(),
      blueprintResolver: new BlueprintResolver(),
      dockerService: fake<DockerService>({
        assertAvailable: () => Promise.resolve(),
        assertProfileUsable: () => {
          if (!profileUsable) throw new Error("built for linux/s390x");
        },
        toHostPath: (p) => Promise.resolve(path.resolve(p)),
        panelId: () => "panel",
      }),
      serversRepo: fake<ServersRepository>(),
      networksRepo: fake<NetworksRepository>({ findByServer: () => null }),
    });
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  const scopeOf = (t: LaunchTarget) => real.scope(t);
  const optionsOf = async (t: LaunchTarget, command = "") => {
    const runtime = await real.dockerRuntime(t, scopeOf(t), command, undefined);
    return (runtime as unknown as { opts: DockerRuntimeOptions }).opts;
  };

  test("variable and port env names get the resolved values", () => {
    const t = launch(manifest(), { MOTD: "hello", game: 25600 });
    expect(real.launchEnv(t, scopeOf(t))).toEqual({
      SERVER_MOTD: "hello",
      GAME_PORT: "25600",
    });
  });

  test("native runs in the server folder or its workingDir", async () => {
    const plain = launch(manifest());
    expect(await real.nativeCwd(plain, scopeOf(plain))).toBe(
      path.resolve("servers", "srv"),
    );

    const bp = manifest({
      startup: {
        command: "./run",
        workingDir: "bin/{{MOTD}}",
        stop: { type: "command", value: "stop" },
      },
    });
    const t = launch(bp);
    const dir = await real.nativeCwd(t, scopeOf(t));
    expect(dir).toBe(path.resolve("servers", "srv", "bin", "hi"));
    expect(fs.existsSync(dir)).toBe(true);
  });

  test("a workingDir that leaves the server folder is refused", async () => {
    const bp = manifest({
      dockerProfile: { image: "img", env: {} },
      startup: {
        command: "./run",
        workingDir: "{{MOTD}}",
        stop: { type: "command", value: "stop" },
      },
    });
    const t = launch(bp, { MOTD: "../../etc" });
    await expect(real.nativeCwd(t, scopeOf(t))).rejects.toThrow(
      "startup.workingDir leaves the server folder",
    );
    await expect(optionsOf(t)).rejects.toThrow(
      "startup.workingDir leaves the server folder",
    );
  });

  test("docker command comes from the profile, or startup for docker-only", () => {
    const dual = launch(
      manifest({
        dockerProfile: { image: "img", env: {}, command: "--motd {{MOTD}}" },
      }),
    );
    expect(real.dockerCommand(dual, scopeOf(dual))).toBe("--motd hi");

    const native = launch(
      manifest({ dockerProfile: { image: "img", env: {} } }),
    );
    expect(real.dockerCommand(native, scopeOf(native))).toBe("");

    const dockerOnly = launch(
      manifest({
        runtime: { kind: "docker" },
        dockerProfile: { image: "img", env: {} },
        startup: { command: "serve 1", stop: { type: "signal:SIGTERM" } },
      }),
    );
    expect(real.dockerCommand(dockerOnly, scopeOf(dockerOnly))).toBe("serve 1");
  });

  test("container gets stdin, env with profile priority and the working dir", async () => {
    const bp = manifest({
      dockerProfile: {
        image: "img:{{MOTD}}",
        env: { SERVER_MOTD: "profile wins", EULA: "TRUE" },
      },
      startup: {
        command: "./run",
        workingDir: "bin",
        stop: { type: "command", value: "stop" },
      },
    });
    const opts = await optionsOf(launch(bp));
    expect(opts.image).toBe("img:hi");
    expect(opts.stdinOpen).toBe(true);
    expect(opts.workdir).toBe("/data/bin");
    expect(opts.env).toEqual([
      "SERVER_MOTD=profile wins",
      "GAME_PORT=25565",
      "EULA=TRUE",
    ]);
  });

  test("the working dir follows the server folder mount", async () => {
    const bp = manifest({
      dockerProfile: {
        image: "img",
        env: {},
        stdinOpen: false,
        mounts: [
          { host: "/opt/cache", container: "/cache" },
          { host: "{{SERVER_DIR}}", container: "/server" },
        ],
      },
    });
    const opts = await optionsOf(launch(bp));
    expect(opts.workdir).toBe("/server");
    expect(opts.stdinOpen).toBe(false);
  });

  test("a profile built for another platform is refused", async () => {
    profileUsable = false;
    const bp = manifest({ dockerProfile: { image: "img", env: {} } });
    await expect(optionsOf(launch(bp))).rejects.toThrow(
      "built for linux/s390x",
    );
  });
});
