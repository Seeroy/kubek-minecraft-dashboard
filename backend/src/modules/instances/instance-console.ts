import {
  PTY_COLS,
  PTY_ROWS,
} from "@/modules/server-types/runtime/process.runtime";
import type { IServerRuntime } from "@/modules/server-types/runtime/runtime.interface";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { InstanceLog, normalizeLine, stripAnsi } from "./instance-log";
import { TerminalCompleter } from "./terminal-completer";

// Console side of a server: output buffering, stdin routing and JLine completion
export class InstanceConsole {
  private readonly log: InstanceLog;
  // Headless emulator that drives JLine for server-side completion, native only
  private completer?: TerminalCompleter;

  constructor(
    onEntry: (entry: IInstanceLog) => void,
    // Plain text of every finished output line, after it's logged
    private readonly onLine: (clean: string) => void,
  ) {
    this.log = new InstanceLog(onEntry);
  }

  entries(): IInstanceLog[] {
    return this.log.get();
  }

  write(line: string | Omit<IInstanceLog, "timestamp">): void {
    this.log.write(line);
  }

  clear(): void {
    this.log.clear();
  }

  // Fresh start or adopt
  reset(): void {
    this.log.reset();
    this.completer = undefined;
  }

  // A PTY only attaches during start(), so wire the completer once it is up
  attach(runtime: IServerRuntime): void {
    if (runtime.interactive && runtime.writeTerminal) {
      const write = runtime.writeTerminal.bind(runtime);
      this.completer = new TerminalCompleter(write, PTY_COLS, PTY_ROWS);
    }
  }

  // Runtime output, the raw stream is teed to the completer emulator
  feed(data: string): void {
    this.completer?.feed(data);
    if (this.completer?.isBusy()) return;
    for (const line of this.log.feed(data)) this.emit(line);
  }

  // Process is gone, flush the half-line so the last log line is not dropped
  close(): void {
    const rest = this.log.flush();
    if (rest) this.emit(rest);
    this.completer = undefined;
  }

  send(runtime: IServerRuntime, cmd: string): void {
    if (this.completer) {
      void this.completer.submitLine(cmd);
    } else {
      runtime.writeStdin(cmd);
    }
  }

  async complete(
    line: string,
  ): Promise<{ completion: string; candidates: string[] }> {
    if (this.completer) return this.completer.complete(line);
    return { completion: line, candidates: [] };
  }

  // Container log tail on adopt, goes to the console only
  replay(history: string): string[] {
    const lines = history
      .split("\n")
      .map((l) => l.replace(/[\r\s]+$/, ""))
      .filter((l) => stripAnsi(l).trim());
    for (const line of lines) this.write(line);
    return lines.map((l) => stripAnsi(l).trim());
  }

  private emit(rawLine: string): void {
    const line = normalizeLine(rawLine);
    if (!line) return;
    this.write(line.display);
    this.onLine(line.clean);
  }
}
