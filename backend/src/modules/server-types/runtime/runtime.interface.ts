import type { LaunchSpec } from "../server-types.types";

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
  readonly pid?: number;
}
