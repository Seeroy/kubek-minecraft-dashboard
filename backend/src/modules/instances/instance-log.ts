import type { IInstanceLog } from "@shared/types/server/instance.types";

// Strip ANSI/VT control sequences before feeding the structured (line-based) log
const ANSI_RE =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g;

export function stripAnsi(input: string): string {
  return input.replace(ANSI_RE, "");
}

/** Line as the console shows it and its plain text */
export interface NormalizedLine {
  display: string;
  clean: string;
}

/**
 * Clean up one terminal line, null if it's not worth logging
 */
export function normalizeLine(rawLine: string): NormalizedLine | null {
  // Drop the trailing CR of a CRLF ending first, so the overwrite-collapse below does
  // not mistake it for a JLine prompt repaint and wipe the whole line
  let display = rawLine.replace(/[\r\s]+$/, "");
  // A remaining CR is a real in-line repaint, keep only the final paint
  const cr = display.lastIndexOf("\r");
  if (cr >= 0) display = display.slice(cr + 1);

  const clean = stripAnsi(display).replace(/\s+$/, "");
  if (!clean.trim()) return null;

  // Drop JLine's prompt echo of a submitted command, no duplication
  if (/^>(\s|$)/.test(clean)) return null;

  return { display, clean };
}

const MAX_LINES = 100;

/**
 * Last console lines plus the unfinished one
 */
export class InstanceLog {
  private entries: IInstanceLog[] = [];
  // In-flight partial line held back from the structured log until its newline arrives
  private pending = "";

  constructor(private readonly onEntry: (entry: IInstanceLog) => void) {}

  get(): IInstanceLog[] {
    return this.entries;
  }

  write(line: string | Omit<IInstanceLog, "timestamp">): void {
    const entry: IInstanceLog =
      typeof line === "string"
        ? { type: "stdout", timestamp: new Date().toISOString(), line }
        : { ...line, timestamp: new Date().toISOString() };

    this.entries.push(entry);
    this.onEntry(entry);
    this.entries = this.entries.slice(-MAX_LINES);
  }

  clear(): void {
    this.entries = [];
  }

  /** Clear everything for a fresh start */
  reset(): void {
    this.entries = [];
    this.pending = "";
  }

  /** Buffer until newline, returns the lines this chunk finished */
  feed(chunk: string): string[] {
    this.pending += chunk;
    const parts = this.pending.split("\n");
    this.pending = parts.pop() ?? "";
    return parts;
  }

  /** Unfinished line, so the last line isn't lost */
  flush(): string | null {
    const rest = this.pending;
    this.pending = "";
    return rest || null;
  }
}
