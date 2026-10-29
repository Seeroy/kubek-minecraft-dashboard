import { getServerPath } from "@/core/utils/serverPath";
import type { NetworksRepository } from "@/modules/database/repositories/networks.repository";
import type { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { JavaService } from "@/modules/java/java.service";
import type { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { assertLaunchVariablesSafe } from "@/modules/server-types/launch-args";
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
import type { ResolveScope } from "@/modules/server-types/server-types.types";
import type {
  KubekBlueprintManifest,
  KubekPlatform,
} from "@kubekpanel/blueprint-sdk";
import type { IServer } from "@shared/types/server/server.types";
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
    return blueprintResolver.substitute(command, scope);
  }

  /**
   * In-container command, for now left empty
   */
  dockerCommand(): string {
    return "";
  }

  /** Build a DockerRuntime from the blueprint docker profile */
  async dockerRuntime(
    { serverId, blueprint }: LaunchTarget,
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

    const image = blueprintResolver.substitute(profile.image, scope);
    const env = Object.entries(profile.env).map(
      ([k, v]) => `${k}=${blueprintResolver.substitute(v, scope)}`,
    );

    const mounts = profile.mounts?.length
      ? profile.mounts
      : [{ host: "{{SERVER_DIR}}", container: "/data" }];
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
      workdir: "/data",
      env,
      portBindings: buildPortBindings(
        blueprint.ports,
        scope,
        this.publishHostIp(serverId),
      ),
      stdinOpen: profile.stdinOpen,
      command,
      labels: containerLabels(
        serverId,
        dockerService.panelId(),
        await dockerService.toHostPath(getServerPath(serverId)),
      ),
      memoryBytes: containerMemoryBytes(memoryLimitMb),
    });
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
  stopMethod({ config, blueprint }: LaunchTarget): StopMethod {
    const stop =
      (config.runtimeKind === "docker"
        ? blueprint?.dockerProfile?.stop
        : undefined) ?? blueprint?.startup?.stop;
    if (stop?.type === "command") return { type: "command", value: stop.value };
    if (stop?.type.startsWith("signal:")) {
      return {
        type: "signal",
        signal: stop.type.split(":")[1] as NodeJS.Signals,
      };
    }
    return { type: "signal", signal: "SIGKILL" };
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
