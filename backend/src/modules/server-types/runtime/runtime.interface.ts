import type { LaunchSpec } from "../server-types.types";

/** One resource sample, CPU as a share of the whole host */
export interface RuntimeStats {
  cpu: number;
  memory: number;
}

export type StopMethod =
  | { type: "command"; value: string }
  | { type: "signal"; signal: NodeJS.Signals };

/**
 * Uniform launch/stop surface for a running server
 */
export interface IServerRuntime {
  start(spec: LaunchSpec): Promise<void>;
  stop(method: StopMethod): Promise<void>;
  kill(): Promise<void>;
  writeStdin(data: string): boolean;
  onStdout(cb: (chunk: string) => void): void;
  onExit(cb: (code: number | null) => void): void;
  /** True while the server is alive, regardless of whether there is a host pid */
  isRunning(): boolean;
  readonly pid?: number;

  /** Runtimes without a host pid measure themselves, native ones are sampled by pid */
  stats?(): Promise<RuntimeStats>;

  /**
   * True when the runtime drives a real PTY
   */
  readonly interactive?: boolean;
  /** Write raw keystrokes straight to the PTY, no trailing newline is added */
  writeTerminal?(data: string): boolean;
  /** Resize the PTY window so the server line editor reflows correctly */
  resize?(cols: number, rows: number): void;
}
