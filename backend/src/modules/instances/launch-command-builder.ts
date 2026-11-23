import { isInside, isRealInside } from "@/core/utils/paths";
import { getServerPath } from "@/core/utils/serverPath";
import { blueprintStopTimeoutSec } from "@/core/utils/stopTimeout";
import type { NetworksRepository } from "@/modules/database/repositories/networks.repository";
import type { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { JavaService } from "@/modules/java/java.service";
import type { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import {
  assertCommandValuesSafe,
  assertLaunchVariablesSafe,
} from "@/modules/server-types/launch-args";
import { containerLabels } from "@/modules/server-types/runtime/container-reconcile";
import {
  containerMemoryBytes,
  containerNameFor,
  DockerRuntime,
} from "@/modules/server-types/runtime/docker.runtime";
import type { DockerService } from "@/modules/server-types/runtime/docker.service";
import {
  buildPortBindings,
  publishHostIp,
} from "@/modules/server-types/runtime/port-bindings";
import type { StopMethod } from "@/modules/server-types/runtime/runtime.interface";

/** RCON stop, the instance runs it itself and falls back to SIGTERM */
export interface RconStopPlan {
  type: "rcon";
  command: string;
  host: string;
  port: number;
  password: string;
  timeoutSec?: number;
}
import type { ResolveScope } from "@/modules/server-types/server-types.types";
import type {
  KubekBlueprintManifest,
  KubekPlatform,
} from "@kubekpanel/blueprint-sdk";
import type { IServer } from "@shared/types/server/server.types";
import fs from "fs";
import path from "path";

export interface LaunchCommandBuilderDeps {
  javaService: JavaService;
  blueprintResolver: BlueprintResolver;
  dockerService: DockerService;
  serversRepo: ServersRepository;
  networksRepo: NetworksRepository;
}

/** Server being launched, config is read on every launch */
export interface LaunchTarget {
  serverId: string;
  config: IServer;
  blueprint?: KubekBlueprintManifest;
}

/**
 * Blueprint and server variables to a native command or a docker container
 */
export class LaunchCommandBuilder {
  constructor(private readonly deps: LaunchCommandBuilderDeps) {}

  /** Common substitution scope, shared by native and docker, no JAVA_BIN */
  scope({ serverId, config, blueprint }: LaunchTarget): ResolveScope {
    if (!blueprint) {
      throw new Error(`Server ${serverId} has no blueprint`);
    }
    return this.deps.blueprintResolver.buildScope(blueprint, {
      serverId,
      serverName: config.name,
      variables: config.variables,
    });
  }

  /** Resolve the native launch command, provisioning managed Java on the way */
  async nativeCommand(
    { serverId, config, blueprint }: LaunchTarget,
    scope: ResolveScope,
  ): Promise<string> {
    const startup = blueprint?.startup;
    // Prefer a per-OS command when the blueprint ships one
    const command =
      startup?.commandByPlatform?.[process.platform as KubekPlatform] ??
      startup?.command;
    if (!blueprint || !command) {
      throw new Error(`Server ${serverId} has no blueprint launch command`);
    }

    const { javaService, blueprintResolver } = this.deps;
    // A per-server JAVA_PATH override wins over the managed runtime
    const customJava = config.variables?.JAVA_PATH;
    if (typeof customJava === "string" && customJava.trim()) {
      const javaPath = await javaService.resolveJavaBinary(customJava.trim());
      if (!javaPath)
        throw new Error(`No java binary found at ${customJava.trim()}`);
      scope.JAVA_BIN = path.resolve(javaPath);
    } else {
      const version = blueprintResolver.javaVersion(blueprint, scope);
      if (version) {
        const javaPath = await javaService.getManagedJavaPath(version);
        if (!javaPath)
          throw new Error(`Managed Java ${version} is not installed`);
        scope.JAVA_BIN = path.resolve(javaPath);
      }
    }

    // Old values saved before the check existed
    assertLaunchVariablesSafe(blueprint, config.variables);
    // Panel values like SERVER_NAME too, a blueprint may put them in the command
    assertCommandValuesSafe(command, scope);
    return blueprintResolver.substitute(command, scope);
  }

  /** Variable and port values for their declared env names */
  launchEnv(
    { blueprint }: LaunchTarget,
    scope: ResolveScope,
  ): Record<string, string> {
    const env: Record<string, string> = {};
    for (const v of blueprint?.variables ?? []) {
      const value = scope[v.key];
      if (v.env && value !== undefined) env[v.env] = String(value);
    }
    for (const p of blueprint?.ports ?? []) {
      if (p.env) env[p.env] = String(scope[p.key] ?? p.default);
    }
    return env;
  }

  /** Native launch folder, startup.workingDir inside the server folder */
  async nativeCwd(
    { serverId, blueprint }: LaunchTarget,
    scope: ResolveScope,
  ): Promise<string> {
    const serverDir = path.resolve(getServerPath(serverId));
    const workingDir = blueprint?.startup?.workingDir;
    if (!workingDir) return serverDir;
    const relative = this.deps.blueprintResolver.substitute(workingDir, scope);
    const cwd = path.resolve(serverDir, relative);
    if (
      !isInside(serverDir, cwd) ||
      !(await isRealInside(serverDir, cwd, true))
    ) {
      throw new Error(
        `startup.workingDir leaves the server folder: ${relative}`,
      );
    }
    fs.mkdirSync(cwd, { recursive: true });
    return cwd;
  }

  /**
   * In-container command: dockerProfile.command, or startup.command for docker-only
   * blueprints. Empty starts the image as is
   */
  dockerCommand({ blueprint }: LaunchTarget, scope: ResolveScope): string {
    const template =
      blueprint?.dockerProfile?.command ??
      (blueprint?.runtime.kind === "docker"
        ? blueprint.startup?.command
        : undefined);
    if (!template?.trim()) return "";
    assertCommandValuesSafe(template, scope);
    return this.deps.blueprintResolver.substitute(template, scope);
  }

  /** Build a DockerRuntime from the blueprint docker profile */
  async dockerRuntime(
    { serverId, config, blueprint }: LaunchTarget,
    scope: ResolveScope,
    command: string,
    memoryLimitMb: number | undefined,
  ): Promise<DockerRuntime> {
    const profile = blueprint?.dockerProfile;
    if (!blueprint || !profile) {
      throw new Error(`Server ${serverId} has no docker profile`);
    }
    const { dockerService, blueprintResolver } = this.deps;
    await dockerService.assertAvailable();
    dockerService.assertProfileUsable(blueprint);

    const image = blueprintResolver.substitute(profile.image, scope);
    // Profile env wins over variable and port env with the same name
    const envMap = this.launchEnv({ serverId, config, blueprint }, scope);
    for (const [k, v] of Object.entries(profile.env)) {
      envMap[k] = blueprintResolver.substitute(v, scope);
    }
    const env = Object.entries(envMap).map(([k, v]) => `${k}=${v}`);

    const mounts = profile.mounts?.length
      ? profile.mounts
      : [{ host: "{{SERVER_DIR}}", container: "/data" }];
    const dataMount =
      mounts.find((m) => /^\{\{\s*SERVER_DIR\s*\}\}$/.test(m.host.trim())) ??
      mounts[0];
    const workdir = this.containerWorkdir(
      dataMount?.container ?? "/data",
      blueprint.startup?.workingDir,
      scope,
    );
    const binds: string[] = [];
    for (const m of mounts) {
      const host = blueprintResolver.substitute(m.host, scope);
      // Bind paths are on the daemon side, named volumes go as is
      const source = path.isAbsolute(host)
        ? await dockerService.toHostPath(host)
        : host;
      binds.push(`${source}:${m.container}`);
    }

    return new DockerRuntime(dockerService, {
      image,
      containerName: containerNameFor(serverId),
      user: profile.user,
      binds,
      workdir,
      env,
      portBindings: buildPortBindings(
        blueprint.ports,
        scope,
        this.publishHostIp(serverId),
      ),
      stdinOpen: profile.stdinOpen ?? true,
      command,
      labels: containerLabels(
        serverId,
        dockerService.panelId(),
        await dockerService.toHostPath(getServerPath(serverId)),
      ),
      memoryBytes: containerMemoryBytes(memoryLimitMb),
    });
  }

  /** Server folder mount plus startup.workingDir, kept inside the mount */
  private containerWorkdir(
    base: string,
    workingDir: string | undefined,
    scope: ResolveScope,
  ): string {
    if (!workingDir) return base;
    const relative = this.deps.blueprintResolver.substitute(workingDir, scope);
    const root = path.posix.resolve(base);
    const workdir = path.posix.resolve(root, relative.replace(/\\/g, "/"));
    const prefix = root.endsWith("/") ? root : `${root}/`;
    if (workdir !== root && !workdir.startsWith(prefix)) {
      throw new Error(
        `startup.workingDir leaves the server folder: ${relative}`,
      );
    }
    return workdir;
  }

  /** Runtime for an already running container, only the name matters */
  adoptRuntime(serverId: string): DockerRuntime {
    return new DockerRuntime(this.deps.dockerService, {
      image: "",
      containerName: containerNameFor(serverId),
      binds: [],
      env: [],
      portBindings: {},
    });
  }

  /** Stop method from the blueprint stop spec, docker prefers its own profile stop */
  stopMethod(target: LaunchTarget): StopMethod | RconStopPlan {
    const { config, blueprint } = target;
    const stop =
      (config.runtimeKind === "docker"
        ? blueprint?.dockerProfile?.stop
        : undefined) ?? blueprint?.startup?.stop;
    const timeoutSec = blueprintStopTimeoutSec(stop?.timeoutSec);
    if (stop?.type === "command")
      return { type: "command", value: stop.value, timeoutSec };
    if (stop?.type === "rcon") {
      const scope = this.scope(target);
      const ref = (r: { value: string | number } | { fromVariable: string }) =>
        "value" in r ? String(r.value) : String(scope[r.fromVariable] ?? "");
      const host = stop.host
        ? this.deps.blueprintResolver.substitute(stop.host, scope).trim()
        : "";
      return {
        type: "rcon",
        command: stop.command,
        host: host || "127.0.0.1",
        port: parseInt(ref(stop.port), 10),
        password: ref(stop.password),
        timeoutSec,
      };
    }
    if (stop?.type.startsWith("signal:")) {
      return {
        type: "signal",
        signal: stop.type.split(":")[1] as NodeJS.Signals,
        timeoutSec,
      };
    }
    // An unknown type gets a graceful signal, the stop timeout still kills
    return { type: "signal", signal: "SIGTERM", timeoutSec };
  }

  /** Velocity backends go on loopback, so players have to use the proxy */
  private publishHostIp(serverId: string): string | undefined {
    const network = this.deps.networksRepo.findByServer(serverId);
    const proxy = network
      ? this.deps.serversRepo.findById(network.proxyServerId)
      : null;
    return publishHostIp(serverId, network, proxy?.runtimeKind);
  }
}
