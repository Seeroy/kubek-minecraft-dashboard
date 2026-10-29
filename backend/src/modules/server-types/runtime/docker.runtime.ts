import { getErrorMessage } from "@/core/utils/error";
import { stopTimeoutSec } from "@/core/utils/stopTimeout";
import { Logger } from "@nestjs/common";
import type { Container } from "dockerode";
import { type Duplex, Writable } from "node:stream";
import type { LaunchSpec } from "../server-types.types";
import { demuxLogBuffer } from "./docker-logs";
import type { DockerService } from "./docker.service";
import type {
  IServerRuntime,
  RuntimeStats,
  StopMethod,
} from "./runtime.interface";

export { containerNameFor } from "./container-reconcile";

/** Old lines shown in the console of an adopted container */
const ADOPT_HISTORY_LINES = 100;

// 304 already in that state, 404 gone, 409 not running or being removed
const EXPECTED_STATUSES = new Set([304, 404, 409]);

function dockerStatus(err: unknown): number | undefined {
  const code = (err as { statusCode?: unknown } | null)?.statusCode;
  return typeof code === "number" ? code : undefined;
}

/** Published port, empty HostIp means all interfaces */
export interface PortBinding {
  HostPort: string;
  HostIp?: string;
}

export interface DockerRuntimeOptions {
  /** image with {{...}} already substituted */
  image: string;
  containerName: string;
  user?: string;
  /** bind mounts as "<abs host path>:<container path>" */
  binds: string[];
  /** working dir inside the container, usually /data */
  workdir?: string;
  /** env entries as "KEY=value" */
  env: string[];
  /** "25565/tcp" -> [{ HostPort: "25565" }] */
  portBindings: Record<string, PortBinding[]>;
  stdinOpen?: boolean;
  /** in-container command, usually empty since the image entrypoint starts the server */
  command?: string;
  /** kubek.* labels to find the container after a restart */
  labels?: Record<string, string>;
  /** hard memory cap in bytes, unset means no limit */
  memoryBytes?: number;
}

/**
 * Memory cap for a JVM container, heap plus room for the rest
 * Big on purpose, an OOM kill is worse
 */
export function containerMemoryBytes(xmxMb?: number): number | undefined {
  if (!xmxMb || !Number.isFinite(xmxMb) || xmxMb <= 0) return undefined;
  const mb = Math.max(Math.ceil(xmxMb * 1.25), xmxMb + 1024);
  return mb * 1024 * 1024;
}

/**
 * Docker runtime: manages a server as a container through the Engine API
 */
export class DockerRuntime implements IServerRuntime {
  private readonly logger = new Logger(DockerRuntime.name);
  private container?: Container;
  private stdoutCb?: (chunk: string) => void;
  private exitCb?: (code: number | null) => void;
  private running = false;
  private stdin?: NodeJS.ReadWriteStream & Partial<Duplex>;

  constructor(
    private readonly docker: DockerService,
    private readonly opts: DockerRuntimeOptions,
  ) {}

  /** No host pid for a container, kept undefined on purpose */
  get pid(): number | undefined {
    return undefined;
  }

  async start(spec: LaunchSpec): Promise<void> {
    const api = this.docker.getDocker();
    await this.removeStale();

    const cmd = this.opts.command?.trim()
      ? this.opts.command.trim().split(/\s+/)
      : undefined;

    this.container = await api.createContainer({
      name: this.opts.containerName,
      Image: this.opts.image,
      Cmd: cmd,
      Env: this.mergeEnv(spec.env),
      WorkingDir: this.opts.workdir,
      User: this.opts.user,
      OpenStdin: !!this.opts.stdinOpen,
      StdinOnce: false,
      Tty: false,
      Labels: this.opts.labels,
      // Same stop timeout as the panel for docker stop
      StopTimeout: stopTimeoutSec(),
      ExposedPorts: this.exposedPorts(),
      HostConfig: {
        Binds: this.opts.binds,
        PortBindings: this.opts.portBindings,
        // Lets a proxy in a container reach backends published on the host
        ExtraHosts: ["host.docker.internal:host-gateway"],
        AutoRemove: false,
        // Restarts are up to the panel, not the daemon
        RestartPolicy: { Name: "no" },
        LogConfig: {
          Type: "json-file",
          Config: { "max-size": "20m", "max-file": "3" },
        },
        ...(this.opts.memoryBytes ? { Memory: this.opts.memoryBytes } : {}),
      },
    });

    await this.attachStdin(!!this.opts.stdinOpen);
    await this.container.start();
    this.running = true;

    this.watchExit();
    await this.followLogs();
  }

  /**
   * Take over a container that kept running while the panel was down
   * Returns recent output and the start time
   */
  async adopt(
    containerId: string,
  ): Promise<{ history: string; startedAt?: string }> {
    const container = this.docker.getDocker().getContainer(containerId);
    const info = await container.inspect();
    if (!info.State?.Running) {
      throw new Error(`Container ${info.Name} is not running`);
    }
    this.container = container;
    this.running = true;

    await this.attachStdin(!!info.Config?.OpenStdin);
    this.watchExit();

    // History up to now, then follow from now, no doubled lines
    const now = Math.floor(Date.now() / 1000);
    let history = "";
    try {
      const buf = await container.logs({
        follow: false,
        stdout: true,
        stderr: true,
        tail: ADOPT_HISTORY_LINES,
        until: now,
      });
      history = demuxLogBuffer(Buffer.from(buf), !!info.Config?.Tty);
    } catch (err) {
      // history is a nicety, the follow below matters
      this.ignoreExpected(err, "read log history");
    }
    await this.followLogs(now);

    const startedAt = info.State.StartedAt;
    return {
      history,
      startedAt:
        startedAt && !startedAt.startsWith("0001") ? startedAt : undefined,
    };
  }

  /** Exit watch first, so a crash is caught even if logs fail */
  private watchExit(): void {
    if (!this.container) return;
    void this.container
      .wait()
      .then((data: { StatusCode: number }) => this.emitExit(data.StatusCode))
      .catch(() => this.emitExit(null))
      .finally(() => void this.removeContainer());
  }

  /** Read output via logs(follow), since in unix seconds */
  private async followLogs(since?: number): Promise<void> {
    if (!this.container) return;
    const sink = new Writable({
      write: (chunk: Buffer, _enc, done) => {
        this.stdoutCb?.(chunk.toString());
        done();
      },
    });
    try {
      const logStream = await this.container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        ...(since ? { since } : {}),
      });
      // Without a TTY stdout/stderr are multiplexed, dockerode demuxes them for us
      this.container.modem.demuxStream(logStream, sink, sink);
    } catch (err) {
      this.ignoreExpected(err, "follow logs");
    }
  }

  async stop(method: StopMethod): Promise<void> {
    if (!this.container) return;
    if (method.type === "command") {
      this.writeStdin(method.value);
      return;
    }
    try {
      if (method.signal === "SIGKILL") {
        await this.kill();
      } else if (method.signal === "SIGTERM") {
        // Daemon sends SIGTERM and kills only after the timeout
        await this.container.stop({ t: stopTimeoutSec() });
      } else {
        await this.container.kill({ signal: method.signal });
      }
    } catch (err) {
      this.ignoreExpected(err, "stop");
    }
  }

  async kill(): Promise<void> {
    if (!this.container) return;
    try {
      await this.container.kill();
    } catch (err) {
      this.ignoreExpected(err, "kill");
    }
    try {
      await this.container.remove({ force: true });
    } catch (err) {
      this.ignoreExpected(err, "remove");
    }
  }

  writeStdin(data: string): boolean {
    if (!this.container) return false;
    const command = data.trim();
    if (!command) return false;
    if (this.stdin?.writable) {
      this.stdin.write(command + "\n");
      return true;
    }
    void this.execConsole(command);
    return true;
  }

  /**
   * Hijacked stdin works on Bun 1.4+, it is the only console for images
   * without RCON such as proxies. rcon-cli stays as the fallback
   */
  private async attachStdin(open: boolean): Promise<void> {
    if (!this.container || !open) return;
    try {
      const stream = (await this.container.attach({
        stream: true,
        stdin: true,
        stdout: false,
        stderr: false,
        hijack: true,
      })) as unknown as NodeJS.ReadWriteStream & Partial<Duplex>;
      stream.on("error", () => this.dropStdin());
      stream.on("close", () => this.dropStdin());
      this.stdin = stream;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.stdoutCb?.(`[kubek] stdin attach failed, using rcon-cli: ${msg}\n`);
    }
  }

  private dropStdin(): void {
    const stream = this.stdin;
    this.stdin = undefined;
    stream?.destroy?.();
  }

  /** Console command through rcon-cli inside the container */
  private async execConsole(command: string): Promise<void> {
    if (!this.container) return;
    try {
      const exec = await this.container.exec({
        Cmd: ["rcon-cli", command],
        AttachStdout: true,
        AttachStderr: true,
      });
      const stream = (await exec.start({
        Tty: false,
      })) as unknown as NodeJS.ReadableStream & {
        on(event: string, cb: () => void): void;
      };
      // Buffer the whole rcon response, then mirror it into the console
      const chunks: Buffer[] = [];
      const collector = new Writable({
        write: (chunk: Buffer, _enc, done) => {
          chunks.push(chunk);
          done();
        },
      });
      this.container.modem.demuxStream(stream, collector, collector);
      stream.on("end", () => {
        const text = Buffer.concat(chunks).toString().trimEnd();
        if (text) this.stdoutCb?.(text + "\n");
        void exec
          .inspect()
          .then((info: { ExitCode?: number | null }) => {
            if (info.ExitCode)
              this.stdoutCb?.(
                `[kubek] rcon-cli exited with code ${info.ExitCode}\n`,
              );
          })
          .catch(() => {});
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.stdoutCb?.(`[kubek] console command failed: ${msg}\n`);
    }
  }

  onStdout(cb: (chunk: string) => void): void {
    this.stdoutCb = cb;
  }

  onExit(cb: (code: number | null) => void): void {
    this.exitCb = cb;
  }

  isRunning(): boolean {
    return this.running;
  }

  /** One stats sample, CPU share from the cpu/precpu delta and memory without page cache */
  async stats(): Promise<RuntimeStats> {
    if (!this.container) return { cpu: 0, memory: 0 };
    const s = await this.container.stats({ stream: false });
    const cpuDelta =
      s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      (s.cpu_stats.system_cpu_usage ?? 0) -
      (s.precpu_stats.system_cpu_usage ?? 0);
    // systemDelta already spans every core, so this is the share of the whole host
    const cpu =
      systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * 100 : 0;
    // Same figure as docker stats, cgroup v2 reports inactive_file and v1 reports cache
    const memStats = s.memory_stats.stats as Record<string, number> | undefined;
    const cache = memStats?.inactive_file ?? memStats?.cache ?? 0;
    const memory = Math.max(0, (s.memory_stats.usage ?? 0) - cache);
    return { cpu, memory };
  }

  private emitExit(code: number | null): void {
    this.running = false;
    this.dropStdin();
    this.exitCb?.(code);
  }

  /** Remove the exited container  */
  private async removeContainer(): Promise<void> {
    if (!this.container) return;
    try {
      await this.container.remove({ force: true });
    } catch (err) {
      this.ignoreExpected(err, "remove");
    }
  }

  /** Remove an old container with our name, never a running one */
  private removeStale = async (): Promise<void> => {
    const stale = this.docker.getDocker().getContainer(this.opts.containerName);
    let running: boolean;
    try {
      running = !!(await stale.inspect()).State?.Running;
    } catch (err) {
      // 404 when there is nothing to clean up
      this.ignoreExpected(err, "inspect old container");
      return;
    }
    if (running) {
      throw new Error(
        `Container ${this.opts.containerName} is already running outside the panel, stop it with docker stop first`,
      );
    }
    try {
      await stale.remove({ force: true });
    } catch (err) {
      this.ignoreExpected(err, "remove old container");
    }
  };

  // Expected daemon answers stay quiet, anything else is worth a warning
  private ignoreExpected(err: unknown, action: string): void {
    const status = dockerStatus(err);
    if (status !== undefined && EXPECTED_STATUSES.has(status)) return;
    this.logger.warn(
      `Could not ${action} for ${this.opts.containerName}: ${getErrorMessage(err)}`,
    );
  }

  private mergeEnv(extra: Record<string, string>): string[] {
    const fromSpec = Object.entries(extra).map(([k, v]) => `${k}=${v}`);
    return [...this.opts.env, ...fromSpec];
  }

  private exposedPorts(): Record<string, Record<string, never>> {
    const out: Record<string, Record<string, never>> = {};
    for (const port of Object.keys(this.opts.portBindings)) out[port] = {};
    return out;
  }
}
