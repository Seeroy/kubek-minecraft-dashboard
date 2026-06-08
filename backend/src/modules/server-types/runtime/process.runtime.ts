import { killPromise } from "@/core/utils/promiseKill";
import { ChildProcess, spawn } from "node:child_process";
import type { LaunchSpec } from "../server-types.types";
import type { IServerRuntime, StopMethod } from "./runtime.interface";

/**
 * Native runtime: spawns the resolved startup command in the server directory
 */
export class ProcessRuntime implements IServerRuntime {
  private proc?: ChildProcess | null;
  private stdoutCb?: (chunk: string) => void;
  private exitCb?: (code: number | null) => void;

  get pid(): number | undefined {
    return this.proc?.pid;
  }

  async start(spec: LaunchSpec): Promise<void> {
    this.proc = spawn(spec.command, {
      shell: true,
      cwd: spec.cwd,
      env: { ...process.env, ...spec.env },
    });
    this.proc.unref();

    this.proc.stdout?.on("data", (chunk: Buffer) =>
      this.stdoutCb?.(chunk.toString()),
    );
    this.proc.stderr?.on("data", (chunk: Buffer) =>
      this.stdoutCb?.(chunk.toString()),
    );
    this.proc.on("close", (code) => this.exitCb?.(code));
  }

  async stop(method: StopMethod): Promise<void> {
    if (!this.proc) return;
    if (method.type === "command") {
      this.writeStdin(method.value);
    } else {
      await this.kill(method.signal);
    }
  }

  async kill(signal: NodeJS.Signals = "SIGKILL"): Promise<void> {
    if (this.proc?.pid) await killPromise(this.proc.pid, signal);
  }

  writeStdin(data: string): boolean {
    if (this.proc?.stdin && this.proc.pid) {
      this.proc.stdin.write(Buffer.from(data, "utf-8").toString() + "\n");
      return true;
    }
    return false;
  }

  onStdout(cb: (chunk: string) => void): void {
    this.stdoutCb = cb;
  }

  onExit(cb: (code: number | null) => void): void {
    this.exitCb = cb;
  }
}
