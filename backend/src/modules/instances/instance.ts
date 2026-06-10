import { asyncTimeout } from "@/core/utils/asyncTimeout";
import { generateRandomString } from "@/core/utils/randomString";
import { getServerPath } from "@/core/utils/serverPath";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ErrorRecognizerService } from "@/modules/error-recognition/error-recognizer.service";
import { JavaService } from "@/modules/java/java.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { QueryRegistry } from "@/modules/server-types/query-protocols/query-registry.service";
import {
  containerNameFor,
  DockerRuntime,
} from "@/modules/server-types/runtime/docker.runtime";
import { DockerService } from "@/modules/server-types/runtime/docker.service";
import {
  ProcessRuntime,
  PTY_COLS,
  PTY_ROWS,
} from "@/modules/server-types/runtime/process.runtime";
import type {
  IServerRuntime,
  StopMethod,
} from "@/modules/server-types/runtime/runtime.interface";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { ResolveScope } from "@/modules/server-types/server-types.types";
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
import { TerminalCompleter } from "./terminal-completer";

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
  dockerService: DockerService;
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

// Strip ANSI/VT control sequences before feeding the structured (line-based) log
const ANSI_RE =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g;
function stripAnsi(input: string): string {
  return input.replace(ANSI_RE, "");
}

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

  // In-flight partial line held back from the structured log until its newline arrives
  private termLineBuf: string = "";

  // Headless emulator that drives JLine for server-side completion, native only
  private completer?: TerminalCompleter;

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
  private readonly dockerService: DockerService;

  constructor(deps: ServerInstanceDeps, config: IServer, serverId?: string) {
    this.javaService = deps.javaService;
    this.serverEventsService = deps.serverEventsService;
    this.errorRecognizerService = deps.errorRecognizerService;
    this.serversRepo = deps.serversRepo;
    this.blueprintRegistry = deps.blueprintRegistry;
    this.queryRegistry = deps.queryRegistry;
    this.blueprintResolver = deps.blueprintResolver;
    this.dockerService = deps.dockerService;

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

  /** isRunning for native and docker */
  isRunning(): boolean {
    return this.serverRuntime?.isRunning() ?? false;
  }

  input(cmd: string, byUser?: IUser): boolean {
    if (this.serverRuntime && this.isRunning()) {
      // Route through the completer when present
      if (this.completer) {
        void this.completer.submitLine(cmd);
      } else {
        this.serverRuntime.writeStdin(cmd);
      }
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

    // Flush any half-line still held back so the last log line is not dropped
    if (this.termLineBuf) {
      this.emitStructuredLine(this.termLineBuf);
      this.termLineBuf = "";
    }
    this.completer = undefined;

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
    if (this.completer && this.isRunning()) {
      return this.completer.complete(line);
    }
    return { completion: line, candidates: [] };
  }

  /**
   * Runtime output sink. The raw stream is teed to the headless completer emulator
   */
  private onData(data: string): void {
    this.completer?.feed(data);
    if (this.completer?.isBusy()) return;
    this.feedStructured(data);
  }

  /** Buffer until a newline, then emit each complete line into the structured log */
  private feedStructured(chunk: string): void {
    this.termLineBuf += chunk;
    const parts = this.termLineBuf.split("\n");
    this.termLineBuf = parts.pop() ?? "";
    for (const part of parts) this.emitStructuredLine(part);
  }

  /**
   * Normalize one raw line and record it
   */
  private emitStructuredLine(rawLine: string): void {
    // Drop the trailing CR of a CRLF ending first, so the overwrite-collapse below does
    // not mistake it for a JLine prompt repaint and wipe the whole line
    let display = rawLine.replace(/[\r\s]+$/, "");
    // A remaining CR is a real in-line repaint, keep only the final paint
    const cr = display.lastIndexOf("\r");
    if (cr >= 0) display = display.slice(cr + 1);

    const clean = stripAnsi(display).replace(/\s+$/, "");
    if (!clean.trim()) return;

    // Drop JLine's prompt echo of a submitted command, no duplication
    if (/^>(\s|$)/.test(clean)) return;

    this.writeLog(display);
    this.checkStatusFromLog(clean);
    this.checkForErrors(clean);
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
    if (this.serverRuntime && this.isRunning()) {
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

  async start(): Promise<boolean> {
    if (this.isRunning()) return false;

    this.cleanupLog();
    this.termLineBuf = "";
    this.completer = undefined;
    this.updateStatus(ServerStatus.STARTING);

    const kind = this.config.runtimeKind ?? "native";
    const scope = this.buildLaunchScope();

    let command: string;
    if (kind === "docker") {
      command = this.resolveDockerCommand(scope);
      this.serverRuntime = await this.createDockerRuntime(scope, command);
    } else {
      command = await this.resolveNativeCommand(scope);
      this.serverRuntime = new ProcessRuntime();
    }

    this.serverRuntime.onStdout((chunk) => this.onData(chunk));
    this.serverRuntime.onExit((code) => this.onClose(code));
    await this.serverRuntime.start({
      cwd: getServerPath(this.serverId),
      command,
      env: {},
    });

    // A PTY only attaches during start(), so wire the completer once it is up
    if (this.serverRuntime.interactive && this.serverRuntime.writeTerminal) {
      const write = this.serverRuntime.writeTerminal.bind(this.serverRuntime);
      this.completer = new TerminalCompleter(write, PTY_COLS, PTY_ROWS);
    }

    this.pid = this.serverRuntime.pid;
    this.startedAt = new Date().toISOString();
    this.stoppedAt = undefined;
    return true;
  }

  /** Common substitution scope, shared by native and docker, no JAVA_BIN */
  private buildLaunchScope(): ResolveScope {
    const blueprint = this.blueprint;
    if (!blueprint) {
      throw new Error(`Server ${this.serverId} has no blueprint`);
    }
    return this.blueprintResolver.buildScope(blueprint, {
      serverId: this.serverId,
      serverName: this.config.name,
      variables: this.config.variables,
    });
  }

  /** Resolve the native launch command, provisioning managed Java on the way */
  private async resolveNativeCommand(scope: ResolveScope): Promise<string> {
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

    const version = this.blueprintResolver.javaVersion(blueprint, scope);
    if (version) {
      const javaPath = await this.javaService.getManagedJavaPath(version);
      if (!javaPath)
        throw new Error(`Managed Java ${version} is not installed`);
      scope.JAVA_BIN = path.resolve(javaPath);
    }

    return this.blueprintResolver.substitute(command, scope);
  }

  /**
   * In-container command, for now left empty
   */
  private resolveDockerCommand(_scope: ResolveScope): string {
    return "";
  }

  /** Build a DockerRuntime from the blueprint docker profile */
  private async createDockerRuntime(
    scope: ResolveScope,
    command: string,
  ): Promise<DockerRuntime> {
    const blueprint = this.blueprint;
    const profile = blueprint?.dockerProfile;
    if (!blueprint || !profile) {
      throw new Error(`Server ${this.serverId} has no docker profile`);
    }
    await this.dockerService.assertAvailable();

    const image = this.blueprintResolver.substitute(profile.image, scope);
    const env = Object.entries(profile.env).map(
      ([k, v]) => `${k}=${this.blueprintResolver.substitute(v, scope)}`,
    );

    const mounts = profile.mounts?.length
      ? profile.mounts
      : [{ host: "{{SERVER_DIR}}", container: "/data" }];
    const binds = mounts.map(
      (m) =>
        `${this.blueprintResolver.substitute(m.host, scope)}:${m.container}`,
    );

    return new DockerRuntime(this.dockerService, {
      image,
      containerName: containerNameFor(this.serverId),
      user: profile.user,
      binds,
      workdir: "/data",
      env,
      portBindings: this.buildPortBindings(blueprint, scope),
      stdinOpen: profile.stdinOpen,
      command,
    });
  }

  /** Map blueprint ports to docker host-port bindings, publishing host:container 1:1 */
  private buildPortBindings(
    blueprint: KubekBlueprintManifest,
    scope: ResolveScope,
  ): Record<string, { HostPort: string }[]> {
    const out: Record<string, { HostPort: string }[]> = {};
    for (const port of blueprint.ports) {
      const value = scope[port.key] ?? port.default;
      const hostPort = String(value);
      const protocols =
        port.protocol === "tcp+udp" ? ["tcp", "udp"] : [port.protocol];
      for (const proto of protocols) {
        out[`${value}/${proto}`] = [{ HostPort: hostPort }];
      }
    }
    return out;
  }

  async stop(byUser?: IUser): Promise<boolean> {
    if (!this.serverRuntime || !this.isRunning()) return false;

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

  /** Stop method from the blueprint stop spec, docker prefers its own profile stop */
  private resolveStopMethod(): StopMethod {
    const stop =
      (this.config.runtimeKind === "docker"
        ? this.blueprint?.dockerProfile?.stop
        : undefined) ?? this.blueprint?.startup?.stop;
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
