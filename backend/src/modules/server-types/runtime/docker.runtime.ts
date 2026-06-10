import type { Container } from "dockerode";
import { Writable } from "node:stream";
import type { LaunchSpec } from "../server-types.types";
import type { DockerService } from "./docker.service";
import type { IServerRuntime, StopMethod } from "./runtime.interface";

/** Deterministic container name for a server so a crashed panel can find its containers */
export function containerNameFor(serverId: string): string {
  return `kubek-${serverId}`;
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
  portBindings: Record<string, { HostPort: string }[]>;
  stdinOpen?: boolean;
  /** in-container command, usually empty since the image entrypoint starts the server */
  command?: string;
}

/**
 * Docker runtime: manages a server as a container through the Engine API
 */
export class DockerRuntime implements IServerRuntime {
  private container?: Container;
  private stdoutCb?: (chunk: string) => void;
  private exitCb?: (code: number | null) => void;
  private running = false;

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
      // No stdin attach, console input goes through rcon-cli exec instead, hijacked
      // stdin/exec streams fail with a 101 upgrade on Bun (dockerode #714)
      // TODO: Wait for fix in Bun
      OpenStdin: false,
      Tty: false,
      ExposedPorts: this.exposedPorts(),
      HostConfig: {
        Binds: this.opts.binds,
        PortBindings: this.opts.portBindings,
        AutoRemove: false,
      },
    });

    await this.container.start();
    this.running = true;

    // Wire exit detection FIRST so a crash is caught even if log wiring fails
    void this.container
      .wait()
      .then((data: { StatusCode: number }) => this.emitExit(data.StatusCode))
      .catch(() => this.emitExit(null))
      .finally(() => void this.removeContainer());

    // Read output via logs(follow)
    const sink = new Writable({
      write: (chunk: Buffer, _enc, done) => {
        this.stdoutCb?.(chunk.toString());
        done();
      },
    });
    try {
      const logStream = (await this.container.logs({
        follow: true,
        stdout: true,
        stderr: true,
      })) as unknown as NodeJS.ReadableStream;
      // Without a TTY stdout/stderr are multiplexed, dockerode demuxes them for us
      this.container.modem.demuxStream(logStream, sink, sink);
    } catch {
      // logs unavailable, oops
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
      } else {
        // The daemon delivers the signal to PID 1, container shuts down gracefully on SIGTERM
        await this.container.kill({ signal: method.signal });
      }
    } catch {
      // container may already be gone
    }
  }

  async kill(): Promise<void> {
    if (!this.container) return;
    try {
      await this.container.kill();
    } catch {
      // already stopped
    }
    try {
      await this.container.remove({ force: true });
    } catch {
      // 404/409 when AutoRemove already cleaned it up
    }
  }

  writeStdin(data: string): boolean {
    if (!this.container) return false;
    const command = data.trim();
    if (!command) return false;
    void this.execConsole(command);
    return true;
  }

  /**
   * Run a console command through rcon-cli inside the container
   */
  private async execConsole(command: string): Promise<void> {
    if (!this.container) return;
    try {
      const exec = await this.container.exec({
        Cmd: ["rcon-cli", command],
        AttachStdout: true,
        AttachStderr: true,
      });
      // No hijack, we only read output, hijack triggers a 101 upgrade dockerode mishandles on Bun
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

  /** One stats sample, CPU percent from the cpu/precpu delta and memory from usage */
  async stats(): Promise<{ cpu: number; memory: number }> {
    if (!this.container) return { cpu: 0, memory: 0 };
    const s = await this.container.stats({ stream: false });
    const cpuDelta =
      s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      (s.cpu_stats.system_cpu_usage ?? 0) -
      (s.precpu_stats.system_cpu_usage ?? 0);
    const cores =
      s.cpu_stats.online_cpus ||
      s.cpu_stats.cpu_usage.percpu_usage?.length ||
      1;
    const cpu =
      systemDelta > 0 && cpuDelta > 0
        ? (cpuDelta / systemDelta) * cores * 100
        : 0;
    return { cpu, memory: s.memory_stats.usage ?? 0 };
  }

  private emitExit(code: number | null): void {
    this.running = false;
    this.exitCb?.(code);
  }

  /** Remove the exited container  */
  private async removeContainer(): Promise<void> {
    if (!this.container) return;
    try {
      await this.container.remove({ force: true });
    } catch {
      // already removed
    }
  }

  private removeStale = async (): Promise<void> => {
    try {
      await this.docker
        .getDocker()
        .getContainer(this.opts.containerName)
        .remove({ force: true });
    } catch {
      // 404 when there is nothing to clean up
    }
  };

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
