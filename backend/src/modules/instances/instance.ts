import { ApiErrorCode } from "@/core/errors/error-codes";
import type { ServerLocksService } from "@/core/locks/server-locks.service";
import { ConflictException } from "@nestjs/common";
import { asyncTimeout } from "@/core/utils/asyncTimeout";
import { getErrorMessage } from "@/core/utils/error";
import { generateRandomString } from "@/core/utils/randomString";
import { propertyPort } from "@/core/properties/properties-values";
import { getServerPath } from "@/core/utils/serverPath";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ErrorRecognizerService } from "@/modules/error-recognition/error-recognizer.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { QueryRegistry } from "@/modules/server-types/query-protocols/query-registry.service";
import { DockerRuntime } from "@/modules/server-types/runtime/docker.runtime";
import { ProcessRuntime } from "@/modules/server-types/runtime/process.runtime";
import type {
  IServerRuntime,
  RuntimeStats,
} from "@/modules/server-types/runtime/runtime.interface";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { ServerEventsService } from "@/ws/services/server-events.service";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import {
  IInstance,
  type IInstanceLog,
  type IServerDiagnostic,
} from "@shared/types/server/instance.types";
import { IServer, ServerStatus } from "@shared/types/server/server.types";
import { IUser } from "@shared/types/user.types";
import { CrashRestartPolicy } from "./crash-restart";
import { InstanceConsole } from "./instance-console";
import { InstanceDiagnostics } from "./instance-diagnostics";
import {
  LaunchCommandBuilder,
  type LaunchTarget,
} from "./launch-command-builder";
import { ServerPropertiesFile } from "./server-properties-file";
import { PendingStop } from "./pending-stop";
import { StatusDetector } from "./status-detector";

/** Services a ServerInstance needs */
export interface ServerInstanceDeps {
  serverEventsService: ServerEventsService;
  errorRecognizerService: ErrorRecognizerService;
  serversRepo: ServersRepository;
  blueprintRegistry: ServerTypesRegistry;
  queryRegistry: QueryRegistry;
  blueprintResolver: BlueprintResolver;
  locks: ServerLocksService;
  launcher: LaunchCommandBuilder;
}

export class ServerInstance implements IInstance {
  /** Pause before a crashed server starts again */
  static crashRestartDelayMs = 1000;

  serverId: string;
  port?: number;
  queryPort?: number;
  pid?: number;
  startedAt?: string;
  stoppedAt?: string;
  /** Heap limit the server was launched with */
  memoryLimitMb?: number;
  runtime?: {
    memoryUsedMb?: number;
    maxMemoryMb?: number;
    cpuPercent?: number;
    playersOnline?: number;
    gameVersion?: string;
    startedAt?: string;
    playersList?: string[];
  };

  // Internal metadata
  private serverRuntime?: IServerRuntime | null;
  private readonly console: InstanceConsole;
  private readonly diagnostics: InstanceDiagnostics;
  private readonly crashRestarts = new CrashRestartPolicy();
  private config: IServer;
  private readonly blueprint?: KubekBlueprintManifest;
  private readonly status: StatusDetector;
  private readonly properties: ServerPropertiesFile;

  private readonly pendingStop = new PendingStop();
  // Panel is shutting down, don't restartOnError
  private shuttingDown = false;
  // Stopped or killed on purpose, not a crash
  private exitRequested = false;
  // Removed from the registry, don't restart it
  private disposed = false;

  private readonly serverEventsService: ServerEventsService;
  private readonly serversRepo: ServersRepository;
  private readonly queryRegistry: QueryRegistry;
  private readonly blueprintResolver: BlueprintResolver;
  private readonly locks: ServerLocksService;
  private readonly launcher: LaunchCommandBuilder;

  constructor(deps: ServerInstanceDeps, config: IServer, serverId?: string) {
    this.serverEventsService = deps.serverEventsService;
    this.serversRepo = deps.serversRepo;
    this.queryRegistry = deps.queryRegistry;
    this.blueprintResolver = deps.blueprintResolver;
    this.locks = deps.locks;
    this.launcher = deps.launcher;

    this.config = config;
    this.serverId = serverId || generateRandomString(16);
    this.console = new InstanceConsole(
      (entry) => this.serverEventsService.emitServerLog(this.serverId, entry),
      (line) => this.onLine(line),
    );
    this.diagnostics = new InstanceDiagnostics(
      this.serverId,
      deps.errorRecognizerService,
      deps.serverEventsService,
    );
    this.blueprint = config.blueprintId
      ? deps.blueprintRegistry.get(config.blueprintId)?.manifest
      : undefined;
    this.status = new StatusDetector(this.blueprint);
    this.properties = new ServerPropertiesFile(config.id);
  }

  getLog(): IInstanceLog[] {
    return this.console.entries();
  }

  writeLog(line: string | Omit<IInstanceLog, "timestamp">): void {
    this.console.write(line);
  }

  cleanupLog(): void {
    this.console.clear();
  }

  /** True when the runtime measures itself instead of being sampled by pid */
  hasRuntimeStats(): boolean {
    return !!this.serverRuntime?.stats;
  }

  /** Self-reported resource usage, null for runtimes sampled by pid */
  async runtimeStats(): Promise<RuntimeStats | null> {
    return (await this.serverRuntime?.stats?.()) ?? null;
  }

  /** isRunning for native and docker */
  isRunning(): boolean {
    return this.serverRuntime?.isRunning() ?? false;
  }

  input(cmd: string, byUser?: IUser): boolean {
    if (this.serverRuntime && this.isRunning()) {
      this.console.send(this.serverRuntime, cmd);
      if (byUser) {
        this.writeLog({
          type: "kubek",
          data: {
            type: "user_input",
            id: byUser.id,
            username: byUser.username,
            command: cmd,
          },
        });
      }
      return true;
    }
    return false;
  }

  private onClose(exitCode: number | null): void {
    this.stoppedAt = new Date().toISOString();
    this.pid = undefined;

    this.console.close();

    const crashed = exitCode != null && exitCode > 1 && exitCode !== 127;
    this.updateStatus(crashed ? ServerStatus.CRASHED : ServerStatus.STOPPED);

    this.serverEventsService.emitServerStopped(this.serverId, {
      pid: this.pid,
      stoppedAt: this.stoppedAt,
      exitCode,
      crashed,
    });

    if (crashed) {
      this.writeLog({
        type: "kubek",
        data: { type: "stop", exitCode, causedBy: "crashed" },
      });

      this.serverEventsService.emitServerCrashed(this.serverId, {
        exitCode,
        restartAttempts: this.crashRestarts.count,
      });

      const verdict = this.crashRestarts.onCrash(
        this.config.restartOnError,
        this.shuttingDown || this.exitRequested,
      );
      if (verdict === "exhausted") {
        this.writeLog({
          type: "kubek",
          data: { type: "restart_failed", attempts: this.crashRestarts.count },
        });
      } else if (verdict === "restart") {
        void this.restartAfterCrash();
      }
    } else if (exitCode === 1 || exitCode === 127) {
      this.writeLog({
        type: "kubek",
        data: { type: "stop", exitCode, causedBy: "killed" },
      });
    }

    this.pendingStop.exited();
  }

  /**
   * Start a crashed server again. restart() needs a running server,
   * so launch directly if nobody touched it meanwhile
   */
  private async restartAfterCrash(): Promise<void> {
    await asyncTimeout(ServerInstance.crashRestartDelayMs);
    if (this.disposed || this.shuttingDown || this.isRunning()) return;
    if (
      this.serversRepo.findById(this.serverId)?.status !== ServerStatus.CRASHED
    )
      return;
    try {
      await this.launch();
    } catch (e: unknown) {
      // launch() already said STARTING, but it's still down
      if (!this.isRunning()) this.updateStatus(ServerStatus.CRASHED);
      this.writeLog({
        type: "kubek",
        data: { type: "restart_failed", attempts: this.crashRestarts.count },
      });
      this.writeLog({
        type: "stderr",
        line: `Restart failed: ${getErrorMessage(e)}`,
      });
    }
  }

  /** Removed from the registry, cancel pending stuff */
  dispose(): void {
    this.disposed = true;
  }

  /** True when the underlying runtime drives a PTY, so server-side completion is possible */
  isInteractive(): boolean {
    return this.serverRuntime?.interactive ?? false;
  }

  /**
   * Ask the server's own line editor (JLine) to complete a console line
   */
  async complete(
    line: string,
  ): Promise<{ completion: string; candidates: string[] }> {
    if (!this.isRunning()) return { completion: line, candidates: [] };
    return this.console.complete(line);
  }

  private onData(data: string): void {
    this.console.feed(data);
  }

  // Finished output line, already in the log
  private onLine(line: string): void {
    const status = this.status.detect(line);
    if (status) this.updateStatus(status);
    this.diagnostics.check(line);
  }

  recordDiagnostic(diagnostic: IServerDiagnostic): void {
    this.diagnostics.record(diagnostic);
  }

  clearDiagnostic(errorType: string): void {
    this.diagnostics.clear(errorType);
  }

  getDiagnostics(): IServerDiagnostic[] {
    return this.diagnostics.get();
  }

  private updateStatus(newStatus: ServerStatus): void {
    // Up again, reset restart attempts
    if (newStatus === ServerStatus.RUNNING) this.crashRestarts.reset();

    const currentServer = this.serversRepo.findById(this.serverId);
    if (!currentServer || currentServer.status === newStatus) return;

    this.serversRepo.update(this.serverId, { status: newStatus });

    this.serverEventsService.emitServerStatus(this.serverId, {
      status: newStatus,
      timestamp: new Date().toISOString(),
    });

    this.writeLog({
      type: "kubek",
      data: { type: "status_change", status: newStatus },
    });
  }

  async kill(): Promise<boolean> {
    if (this.serverRuntime && this.isRunning()) {
      this.exitRequested = true;
      await this.serverRuntime.kill();
      return true;
    }
    return false;
  }

  async restart(byUser?: IUser): Promise<boolean> {
    if (this.isRunning()) {
      await this.stop(byUser);
      await asyncTimeout(1000);
      return await this.start();
    }
    return false;
  }

  /** Manual start, also resets restart attempts */
  async start(): Promise<boolean> {
    if (this.isRunning()) return false;
    this.crashRestarts.reset();
    return this.launch();
  }

  private async launch(): Promise<boolean> {
    if (this.isRunning()) return false;
    // Starting on a folder that is being replaced would mix two states
    if (this.locks.holder(this.serverId) === "restore") {
      throw new ConflictException({
        code: ApiErrorCode.SERVER_BUSY,
        message: "A backup is being restored, start the server when it is done",
      });
    }

    this.console.reset();
    this.exitRequested = false;
    this.updateStatus(ServerStatus.STARTING);

    const kind = this.config.runtimeKind ?? "native";
    const target = this.launchTarget();
    const scope = this.launcher.scope(target);
    const xmx = Number(scope.XMX);
    this.memoryLimitMb = xmx > 0 ? xmx : undefined;

    let command: string;
    if (kind === "docker") {
      command = this.launcher.dockerCommand();
      this.serverRuntime = await this.launcher.dockerRuntime(
        target,
        scope,
        command,
        this.memoryLimitMb,
      );
    } else {
      command = await this.launcher.nativeCommand(target, scope);
      this.serverRuntime = new ProcessRuntime();
    }

    this.serverRuntime.onStdout((chunk) => this.onData(chunk));
    this.serverRuntime.onExit((code) => this.onClose(code));
    await this.serverRuntime.start({
      cwd: getServerPath(this.serverId),
      command,
      env: {},
    });

    this.console.attach(this.serverRuntime);

    this.pid = this.serverRuntime.pid;
    this.startedAt = new Date().toISOString();
    this.stoppedAt = undefined;
    return true;
  }

  private launchTarget(): LaunchTarget {
    return {
      serverId: this.serverId,
      config: this.config,
      blueprint: this.blueprint,
    };
  }

  /**
   * Reattach to a container that kept running while the panel was down
   * Console, stdin and stats work like after a normal start
   */
  async adopt(containerId: string): Promise<boolean> {
    if (this.isRunning()) return false;
    const scope = this.launcher.scope(this.launchTarget());
    const xmx = Number(scope.XMX);
    this.memoryLimitMb = xmx > 0 ? xmx : undefined;

    this.console.reset();
    this.exitRequested = false;

    const runtime = this.launcher.adoptRuntime(this.serverId);
    runtime.onStdout((chunk) => this.onData(chunk));
    runtime.onExit((code) => this.onClose(code));
    this.serverRuntime = runtime;

    let adopted: Awaited<ReturnType<DockerRuntime["adopt"]>>;
    try {
      adopted = await runtime.adopt(containerId);
    } catch (e) {
      this.serverRuntime = undefined;
      throw e;
    }

    // Old lines only go to the console, no alerts for old errors
    const lines = this.console.replay(adopted.history);

    this.pid = undefined;
    this.startedAt = adopted.startedAt ?? new Date().toISOString();
    this.stoppedAt = undefined;
    // No status line in the tail means it's been up for a while
    const status = this.status.last(lines) ?? ServerStatus.RUNNING;
    this.updateStatus(status);
    return true;
  }

  async stop(byUser?: IUser): Promise<boolean> {
    if (!this.serverRuntime || !this.isRunning()) return false;
    // Second stop waits for the first one
    if (this.pendingStop.current) return this.pendingStop.current;

    this.exitRequested = true;
    this.updateStatus(ServerStatus.STOPPING);

    const method = this.launcher.stopMethod(this.launchTarget());
    if (method.type === "command") {
      this.input(method.value, byUser);
    } else {
      // Honor the blueprint signal instead of always SIGKILL
      void this.serverRuntime.stop(method);
    }

    // The start-time onExit handler drives onClose, which settles this promise
    return this.pendingStop.begin(() => void this.serverRuntime?.kill());
  }

  /** Runs in a container, survives a panel restart */
  isDocker(): boolean {
    return this.serverRuntime instanceof DockerRuntime;
  }

  /** Stop on panel shutdown, without restartOnError */
  async stopForShutdown(): Promise<boolean> {
    this.shuttingDown = true;
    return this.stop();
  }

  async queryServer(): Promise<unknown> {
    const protocol = this.blueprint?.query?.protocol ?? "minecraft-java";
    const provider = this.queryRegistry.get(protocol);
    if (!this.isRunning() || !provider) return false;

    const port = await this.resolveQueryPort();
    if (!port) return false;

    if (!this.runtime) this.runtime = {};
    if (this.startedAt) this.runtime.startedAt = this.startedAt;

    try {
      const result = await provider.query({ host: "127.0.0.1", port });
      if (!result) {
        return false;
      }

      this.runtime.playersOnline = result.players.online;
      this.runtime.playersList = result.players.list ?? [];

      this.serverEventsService.emitServerQueryData(this.serverId, {
        players: {
          max: result.players.max,
          online: result.players.online,
          list: this.runtime.playersList,
        },
        version: result.version,
        runtime: this.runtime,
      });
      return result;
    } catch {
      this.serverEventsService.emitServerQueryData(this.serverId, {
        runtime: this.runtime,
        error: "unreachable",
      });
      return false;
    }
  }

  /** Resolve the query port: server.properties for minecraft, else the blueprint port */
  private async resolveQueryPort(): Promise<number | undefined> {
    const spData = await this.readServerProperties();
    const port = propertyPort(spData?.["server-port"]);
    if (port) return port;
    if (this.blueprint) {
      const scope = this.blueprintResolver.buildScope(this.blueprint, {
        serverId: this.serverId,
        variables: this.config.variables,
      });
      return this.blueprintResolver.resolveQueryPort(
        this.blueprint.query,
        scope,
      );
    }
    return this.port;
  }

  async readServerProperties(): Promise<Record<string, string> | null> {
    const snapshot = await this.properties.read();
    if (!snapshot) return null;
    this.port = snapshot.port;
    this.queryPort = snapshot.queryPort;
    return snapshot.values;
  }

  /** Replace the key set, comments and untouched lines stay as they were */
  async writeServerProperties(data: Record<string, unknown>): Promise<boolean> {
    return this.properties.write(data);
  }
}
