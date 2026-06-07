import { asyncTimeout } from "@/core/utils/asyncTimeout";
import { generateRandomString } from "@/core/utils/randomString";
import { getServerPath } from "@/core/utils/serverPath";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ErrorRecognizerService } from "@/modules/error-recognition/error-recognizer.service";
import { JavaService } from "@/modules/java/java.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { QueryRegistry } from "@/modules/server-types/query-protocols/query-registry.service";
import { ProcessRuntime } from "@/modules/server-types/runtime/process.runtime";
import type {
  IServerRuntime,
  StopMethod,
} from "@/modules/server-types/runtime/runtime.interface";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { ServerEventsService } from "@/ws/services/server-events.service";
import type {
  KubekBlueprintManifest,
  KubekPlatform,
} from "@kubekpanel/blueprint-sdk";
import {
  IInstance,
  type IInstanceLog,
  type IServerDiagnostic,
} from "@shared/types/server/instance.types";
import { IServer, ServerStatus } from "@shared/types/server/server.types";
import { IUser } from "@shared/types/user.types";
import fs from "fs/promises";
import mcPropsParser from "minecraft-server-properties";
import path from "path";

interface CompiledDetection {
  starting: RegExp[];
  running: RegExp[];
  stopping: RegExp[];
}

/** Services a ServerInstance needs */
export interface ServerInstanceDeps {
  javaService: JavaService;
  serverEventsService: ServerEventsService;
  errorRecognizerService: ErrorRecognizerService;
  serversRepo: ServersRepository;
  blueprintRegistry: ServerTypesRegistry;
  queryRegistry: QueryRegistry;
  blueprintResolver: BlueprintResolver;
}

// Fallback patterns for legacy servers
const LEGACY_DETECTION: CompiledDetection = {
  starting: [
    /Starting minecraft server/i,
    /Loading properties/i,
    /Preparing spawn area/i,
    /Starting server/i,
  ],
  running: [
    /Done \(.*\)! For help/i,
    /Server startup complete/i,
    /ALL SYSTEMS STARTED SUCCESSFULLY/i,
  ],
  stopping: [/Stopping (the )?server/i, /Saving worlds/i, /Saving players/i],
};

export class ServerInstance implements IInstance {
  serverId: string;
  port?: number;
  queryPort?: number;
  pid?: number;
  startedAt?: string;
  stoppedAt?: string;
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
  private log: IInstanceLog[] = [];
  private diagnostics: IServerDiagnostic[] = [];
  private restartAttempts: number = 0;
  private config: IServer;
  private readonly blueprint?: KubekBlueprintManifest;
  private readonly detection: CompiledDetection;

  // Resolver of an in-flight stop(), settled by onClose when the process exits
  private pendingStop?: (ok: boolean) => void;
  private stopTimer?: ReturnType<typeof setTimeout>;

  private readonly javaService: JavaService;
  private readonly serverEventsService: ServerEventsService;
  private readonly errorRecognizerService: ErrorRecognizerService;
  private readonly serversRepo: ServersRepository;
  private readonly blueprintRegistry: ServerTypesRegistry;
  private readonly queryRegistry: QueryRegistry;
  private readonly blueprintResolver: BlueprintResolver;

  constructor(deps: ServerInstanceDeps, config: IServer, serverId?: string) {
    this.javaService = deps.javaService;
    this.serverEventsService = deps.serverEventsService;
    this.errorRecognizerService = deps.errorRecognizerService;
    this.serversRepo = deps.serversRepo;
    this.blueprintRegistry = deps.blueprintRegistry;
    this.queryRegistry = deps.queryRegistry;
    this.blueprintResolver = deps.blueprintResolver;

    this.config = config;
    this.serverId = serverId || generateRandomString(16);
    this.log = [];
    this.restartAttempts = 0;
    this.blueprint = config.blueprintId
      ? this.blueprintRegistry.get(config.blueprintId)?.manifest
      : undefined;
    this.detection = this.compileDetection();
  }

  /** Build status patterns from the blueprint, falling back to legacy mc patterns */
  private compileDetection(): CompiledDetection {
    const d = this.blueprint?.detection;
    if (!d) return LEGACY_DETECTION;
    const compile = (patterns?: string[]) =>
      (patterns ?? []).map((p) => new RegExp(p, "i"));
    return {
      starting: compile(d.starting),
      running: compile(d.running),
      stopping: compile(d.stopping),
    };
  }

  getLog(): IInstanceLog[] {
    return this.log;
  }

  writeLog(line: string | Omit<IInstanceLog, "timestamp">): void {
    let stampedLine: IInstanceLog;
    if (typeof line === "string") {
      stampedLine = {
        type: "stdout",
        timestamp: new Date().toISOString(),
        line,
      };
    } else {
      stampedLine = { ...line, timestamp: new Date().toISOString() };
    }

    if (!stampedLine) return;

    this.log.push(stampedLine);
    this.serverEventsService.emitServerLog(this.serverId, stampedLine);

    this.rotateLog();
  }

  cleanupLog(): void {
    this.log = [];
  }

  private rotateLog(linesOffset: number = 100): void {
    this.log = this.log.slice(linesOffset * -1);
  }

  input(cmd: string, byUser?: IUser): boolean {
    if (this.serverRuntime && this.pid) {
      this.serverRuntime.writeStdin(cmd);
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

    this.updateStatus(ServerStatus.STOPPED);

    this.serverEventsService.emitServerStopped(this.serverId, {
      pid: this.pid,
      stoppedAt: this.stoppedAt,
      exitCode,
    });

    if (exitCode != null && exitCode > 1 && exitCode !== 127) {
      this.writeLog({
        type: "kubek",
        data: { type: "stop", exitCode, causedBy: "crashed" },
      });

      this.serverEventsService.emitServerCrashed(this.serverId, {
        exitCode,
        restartAttempts: this.restartAttempts,
      });

      if (this.config.restartOnError?.enabled) {
        if (
          this.restartAttempts >= (this.config.restartOnError.attempts || 3)
        ) {
          this.writeLog({
            type: "kubek",
            data: { type: "restart_failed", attempts: this.restartAttempts },
          });
        } else {
          this.restartAttempts++;
          this.restart();
        }
      }
    } else if (exitCode === 1 || exitCode === 127) {
      this.writeLog({
        type: "kubek",
        data: { type: "stop", exitCode, causedBy: "killed" },
      });
    }

    if (this.pendingStop) {
      const settle = this.pendingStop;
      this.pendingStop = undefined;
      if (this.stopTimer) clearTimeout(this.stopTimer);
      settle(true);
    }
  }

  private onData(data: string): void {
    const dataSplit = data.toString().split(/\r\n|\n\r|\r|\n/);
    for (const item of dataSplit) {
      if (item.trim()) {
        this.writeLog(item);
        this.checkStatusFromLog(item);
        this.checkForErrors(item);
      }
    }
  }

  /** Match a log line against the compiled status patterns and update status */
  private checkStatusFromLog(line: string): void {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    for (const pattern of this.detection.starting) {
      if (pattern.test(trimmedLine))
        return this.updateStatus(ServerStatus.STARTING);
    }
    for (const pattern of this.detection.running) {
      if (pattern.test(trimmedLine))
        return this.updateStatus(ServerStatus.RUNNING);
    }
    for (const pattern of this.detection.stopping) {
      if (pattern.test(trimmedLine))
        return this.updateStatus(ServerStatus.STOPPING);
    }
  }

  private checkForErrors(line: string): void {
    const error = this.errorRecognizerService.recognizeError(line);
    if (error) {
      this.recordDiagnostic({
        errorType: error.errorType,
        severity: error.severity,
        timestamp: new Date().toISOString(),
      });
      this.serverEventsService.emitServerError(this.serverId, error);
    }
  }

  /** Append a diagnostic to in-memory buffer */
  recordDiagnostic(diagnostic: IServerDiagnostic): void {
    this.diagnostics.push(diagnostic);
    if (this.diagnostics.length > 20) {
      this.diagnostics = this.diagnostics.slice(-20);
    }
  }

  /** Drop diagnostics of a given type */
  clearDiagnostic(errorType: string): void {
    this.diagnostics = this.diagnostics.filter(
      (d) => d.errorType !== errorType,
    );
  }

  getDiagnostics(): IServerDiagnostic[] {
    return this.diagnostics;
  }

  private updateStatus(newStatus: ServerStatus): void {
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
    if (this.serverRuntime && this.pid) {
      await this.serverRuntime.kill();
      return true;
    }
    return false;
  }

  async restart(byUser?: IUser): Promise<boolean> {
    if (this.pid) {
      await this.stop(byUser);
      await asyncTimeout(1000);
      return await this.start();
    }
    return false;
  }

  async start(): Promise<boolean> {
    if (this.pid) return false;

    this.cleanupLog();
    this.updateStatus(ServerStatus.STARTING);

    const command = await this.resolveLaunchCommand();

    this.serverRuntime = new ProcessRuntime();
    this.serverRuntime.onStdout((chunk) => this.onData(chunk));
    this.serverRuntime.onExit((code) => this.onClose(code));
    await this.serverRuntime.start({
      cwd: getServerPath(this.serverId),
      command,
      env: {},
    });

    this.pid = this.serverRuntime.pid;
    this.startedAt = new Date().toISOString();
    this.stoppedAt = undefined;
    return true;
  }

  /** Resolve the native launch command from the blueprint */
  private async resolveLaunchCommand(): Promise<string> {
    const blueprint = this.blueprint;
    const startup = blueprint?.startup;
    // Prefer a per-OS command when the blueprint ships one
    const command =
      startup?.commandByPlatform?.[process.platform as KubekPlatform] ??
      startup?.command;
    if (!blueprint || !command) {
      throw new Error(
        `Server ${this.serverId} has no blueprint launch command`,
      );
    }

    const scope = this.blueprintResolver.buildScope(blueprint, {
      serverId: this.serverId,
      serverName: this.config.name,
      variables: this.config.variables,
    });

    const version = this.blueprintResolver.javaVersion(blueprint, scope);
    if (version) {
      const javaPath = await this.javaService.getManagedJavaPath(version);
      if (!javaPath)
        throw new Error(`Managed Java ${version} is not installed`);
      scope.JAVA_BIN = path.resolve(javaPath);
    }

    return this.blueprintResolver.substitute(command, scope);
  }

  async stop(byUser?: IUser): Promise<boolean> {
    if (!this.serverRuntime || !this.pid) return false;

    this.updateStatus(ServerStatus.STOPPING);

    const method = this.resolveStopMethod();
    if (method.type === "command") {
      this.input(method.value, byUser);
    } else {
      // Honor the blueprint signal instead of always SIGKILL
      void this.serverRuntime.stop(method);
    }

    // The start-time onExit handler drives onClose, which settles this promise
    return new Promise<boolean>((resolve) => {
      this.pendingStop = resolve;
      // If a graceful stop hangs, escalate to SIGKILL so the server can't stick in STOPPING
      this.stopTimer = setTimeout(() => {
        if (!this.pendingStop) return;
        void this.serverRuntime?.kill();
        this.stopTimer = setTimeout(() => {
          if (!this.pendingStop) return;
          const settle = this.pendingStop;
          this.pendingStop = undefined;
          settle(false);
        }, 3000);
      }, 10000);
    });
  }

  /** Stop method from the blueprint stop spec */
  private resolveStopMethod(): StopMethod {
    const stop = this.blueprint?.startup?.stop;
    if (stop?.type === "command") return { type: "command", value: stop.value };
    if (stop?.type.startsWith("signal:")) {
      return {
        type: "signal",
        signal: stop.type.split(":")[1] as NodeJS.Signals,
      };
    }
    return { type: "signal", signal: "SIGKILL" };
  }

  async queryServer(): Promise<unknown> {
    const protocol = this.blueprint?.query?.protocol ?? "minecraft-java";
    const provider = this.queryRegistry.get(protocol);
    if (!this.pid || !provider) return false;

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
    if (spData && spData["server-port"] !== undefined) {
      const port = parseInt(String(spData["server-port"]), 10);
      if (Number.isFinite(port) && port > 0) return port;
    }
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

  async readServerProperties(): Promise<any> {
    const spFilePath = `./servers/${this.config.id}/server.properties`;
    try {
      await fs.access(spFilePath);
      const spFileData = await fs.readFile(spFilePath);
      const parsed = mcPropsParser.parse(spFileData.toString());

      if (parsed["generator-settings"]) {
        parsed["generator-settings"] = JSON.stringify(
          parsed["generator-settings"],
        );
      }

      this.port = parsed["server-port"]
        ? parseInt(parsed["server-port"])
        : undefined;
      this.queryPort = parsed["query.port"]
        ? parseInt(parsed["query.port"])
        : undefined;

      return parsed;
    } catch {
      return false;
    }
  }

  async writeServerProperties(data: object): Promise<boolean> {
    try {
      let result = "";
      for (const [key, value] of Object.entries(data)) {
        if (key && value !== undefined && value !== null) {
          result += key.toString() + "=" + value.toString() + "\n";
        }
      }
      await fs.writeFile(
        `./servers/${this.config.id}/server.properties`,
        result.trim(),
      );
      return true;
    } catch {
      return false;
    }
  }
}
