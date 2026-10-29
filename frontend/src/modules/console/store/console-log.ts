import type { IInstanceLog } from "@shared/types/server/instance.types";

export const MAX_LOG_LINES = 5000;

/**
 * Ring buffer of the open server's console, kept outside React
 * Appending mutates in place and bumps a version, so a busy server
 * costs one counter change per line instead of a 5000 item array copy
 */
class ConsoleLog {
  private lines: IInstanceLog[] = [];
  private version = 0;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = () => this.version;

  getLines = () => this.lines;

  replace(lines: IInstanceLog[]) {
    this.lines = lines.length > MAX_LOG_LINES ? lines.slice(lines.length - MAX_LOG_LINES) : [...lines];
    this.emit();
  }

  append(line: IInstanceLog) {
    this.lines.push(line);
    if (this.lines.length > MAX_LOG_LINES) this.lines.splice(0, this.lines.length - MAX_LOG_LINES);
    this.emit();
  }

  clear() {
    this.lines = [];
    this.emit();
  }

  private emit() {
    this.version++;
    this.listeners.forEach((listener) => listener());
  }
}

export const consoleLog = new ConsoleLog();
