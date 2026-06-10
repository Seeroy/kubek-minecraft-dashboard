import { killPromise } from "@/core/utils/promiseKill";
import { ChildProcess, spawn } from "node:child_process";
import type { LaunchSpec } from "../server-types.types";
import type { IServerRuntime, StopMethod } from "./runtime.interface";

/**
 * Fixed PTY window. Wide enough that JLine lays out completion candidates in few rows,
 * the headless completer emulator must be created with the SAME size to read them back
 */
export const PTY_COLS = 200;
export const PTY_ROWS = 50;

/**
 * Native runtime: the server is spawned attached to a PTY (Bun.Terminal) so it runs
 * exactly as in a real terminal emulator.
 * Bun.Terminal is POSIX plus Windows ConPTY, if the attach fails on the running Bun the
 * runtime falls back to a plain piped child process
 */
export class ProcessRuntime implements IServerRuntime {
  // PTY path
  private proc?: Bun.Subprocess | null;
  private terminal?: Bun.Terminal;
  // Set when a half-started PTY proc is being abandoned, so its callbacks go nowhere
  private ptyAborted = false;
  // Pipe fallback path
  private child?: ChildProcess | null;

  private stdoutCb?: (chunk: string) => void;
  private exitCb?: (code: number | null) => void;
  private exited = false;
  private readonly decoder = new TextDecoder();

  /** True only when a PTY actually attached, so callers know completion is possible */
  get interactive(): boolean {
    return !!this.terminal;
  }

  get pid(): number | undefined {
    return this.proc?.pid ?? this.child?.pid;
  }

  async start(spec: LaunchSpec): Promise<void> {
    if (!this.startPty(spec)) {
      this.startPiped(spec);
    }
  }

  /** sh -c on POSIX, cmd /c on Windows, both inherit the spawned PTY console */
  private shellArgv(command: string): string[] {
    return process.platform === "win32"
      ? ["cmd.exe", "/d", "/s", "/c", command]
      : ["/bin/sh", "-c", command];
  }

  /** Try to spawn attached to a PTY, returns false if this Bun cannot attach one here */
  private startPty(spec: LaunchSpec): boolean {
    try {
      const proc = Bun.spawn(this.shellArgv(spec.command), {
        cwd: spec.cwd,
        env: { ...process.env, ...spec.env },
        terminal: {
          cols: PTY_COLS,
          rows: PTY_ROWS,
          name: "xterm-256color",
          data: (_term, bytes) => {
            if (!this.ptyAborted) this.stdoutCb?.(this.decoder.decode(bytes));
          },
        },
        onExit: (_proc, exitCode, signalCode) => {
          if (this.ptyAborted || this.exited) return;
          this.exited = true;
          this.exitCb?.(exitCode ?? (signalCode != null ? 1 : null));
        },
      });
      // Some platforms/versions accept the option but attach no terminal, abandon that
      // process and fall back rather than run it blind
      if (!proc.terminal) {
        this.ptyAborted = true;
        try {
          proc.kill();
        } catch {
          // already gone
        }
        return false;
      }
      this.proc = proc;
      this.terminal = proc.terminal;
      return true;
    } catch {
      return false;
    }
  }

  private startPiped(spec: LaunchSpec): void {
    this.child = spawn(spec.command, {
      shell: true,
      cwd: spec.cwd,
      env: { ...process.env, ...spec.env },
    });
    this.child.unref();
    this.child.stdout?.on("data", (chunk: Buffer) =>
      this.stdoutCb?.(chunk.toString()),
    );
    this.child.stderr?.on("data", (chunk: Buffer) =>
      this.stdoutCb?.(chunk.toString()),
    );
    this.child.on("close", (code) => {
      if (this.exited) return;
      this.exited = true;
      this.exitCb?.(code);
    });
  }

  async stop(method: StopMethod): Promise<void> {
    if (!this.proc && !this.child) return;
    if (method.type === "command") {
      this.writeStdin(method.value);
    } else {
      await this.kill(method.signal);
    }
  }

  async kill(signal: NodeJS.Signals = "SIGKILL"): Promise<void> {
    if (this.pid) await killPromise(this.pid, signal);
  }

  /** Submit a console command: append a newline so the server line reader sees Enter */
  writeStdin(data: string): boolean {
    return this.writeRaw(data + "\n");
  }

  /** Raw keystrokes from the interactive terminal, forwarded verbatim to the PTY */
  writeTerminal(data: string): boolean {
    return this.writeRaw(data);
  }

  private writeRaw(data: string): boolean {
    if (this.terminal && !this.terminal.closed) {
      this.terminal.write(data);
      return true;
    }
    if (this.child?.stdin && this.child.pid) {
      this.child.stdin.write(Buffer.from(data, "utf-8"));
      return true;
    }
    return false;
  }

  resize(cols: number, rows: number): void {
    if (this.terminal && !this.terminal.closed) {
      this.terminal.resize(cols, rows);
    }
  }

  onStdout(cb: (chunk: string) => void): void {
    this.stdoutCb = cb;
  }

  onExit(cb: (code: number | null) => void): void {
    this.exitCb = cb;
  }

  isRunning(): boolean {
    return !this.exited && !!this.pid;
  }
}
