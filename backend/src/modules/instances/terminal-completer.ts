import { Terminal } from "@xterm/headless";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface CompletionResult {
  /** The line after JLine's inline completion, unchanged if nothing matched */
  completion: string;
  /** Candidate tokens JLine printed when the completion was ambiguous */
  candidates: string[];
}

/**
 * Drives the server's own line editor (JLine) to produce completions without ever
 * showing a raw terminal to the user. A headless emulator interprets the PTY stream so
 * we can read back the inline completion and the candidate grid JLine prints on TAB,
 * then the typed line is cleared again so the panel input stays the source of truth
 */
export class TerminalCompleter {
  private readonly term: Terminal;
  private busy = false;
  private lastWriteAt = 0;

  constructor(
    private readonly writeRaw: (data: string) => void,
    cols: number,
    rows: number,
  ) {
    this.term = new Terminal({ cols, rows, allowProposedApi: true });
  }

  /** Feed raw PTY bytes, the emulator keeps the virtual screen in sync */
  feed(data: string): void {
    this.lastWriteAt = Date.now();
    this.term.write(data);
  }

  /** True while a completion exchange is in flight, the log is suppressed meanwhile */
  isBusy(): boolean {
    return this.busy;
  }

  /**
   * Submit a console command through the same PTY
   */
  async submitLine(line: string): Promise<void> {
    await this.whenIdle();
    this.writeRaw(line + "\n");
  }

  private async whenIdle(): Promise<void> {
    const start = Date.now();
    while (this.busy && Date.now() - start < 3000) await wait(20);
  }

  /**
   * Ask JLine to complete a line
   */
  async complete(line: string): Promise<CompletionResult> {
    if (this.busy) return { completion: line, candidates: [] };
    this.busy = true;
    try {
      // Start from an empty JLine buffer
      this.writeRaw("\x15");
      await this.afterEcho(300);

      if (line) {
        this.writeRaw(line);
        await this.afterEcho(400);
      }
      const rowBefore = this.cursorRow();

      this.writeRaw("\t");
      await this.afterEcho(900);

      // JLine asks before dumping a huge set, decline and keep the inline result
      if (/possibilit/i.test(this.rowText(this.cursorRow()))) {
        this.writeRaw("n");
        await this.afterEcho(400);
      }

      const rowAfter = this.cursorRow();
      const candidates = this.readCandidates(rowBefore, rowAfter);
      const completion = this.readCompletion(line);

      // Leave the editor clean so the user's input field remains authoritative
      this.writeRaw("\x15");
      await this.afterEcho(300);

      return { completion, candidates };
    } finally {
      this.busy = false;
    }
  }

  /**
   * Wait for the server to react to what we just wrote
   */
  private async afterEcho(maxMs: number): Promise<void> {
    const start = Date.now();
    const mark = this.lastWriteAt;
    const idleMs = 60;
    // Phase 1: wait until new bytes arrive in response
    while (Date.now() - start < maxMs && this.lastWriteAt === mark) {
      await wait(15);
    }
    // Phase 2: wait until the response stops streaming
    while (Date.now() - start < maxMs) {
      if (Date.now() - this.lastWriteAt >= idleMs) return;
      await wait(15);
    }
  }

  private cursorRow(): number {
    const b = this.term.buffer.active;
    return b.baseY + b.cursorY;
  }

  private rowText(index: number): string {
    return (
      this.term.buffer.active.getLine(index)?.translateToString(true) ?? ""
    );
  }

  /** Locate the typed text in the redrawn prompt and take its tail as the new line */
  private readCompletion(line: string): string {
    const bottom = this.rowText(this.cursorRow());
    if (!line) return "";
    const idx = bottom.indexOf(line);
    return idx < 0 ? line : bottom.slice(idx);
  }

  /** The candidate grid sits between the original prompt and the redrawn prompt */
  private readCandidates(rowBefore: number, rowAfter: number): string[] {
    if (rowAfter <= rowBefore) return [];
    const out: string[] = [];
    for (let r = rowBefore + 1; r < rowAfter; r++) {
      const text = this.rowText(r);
      if (!text.trim()) continue;
      for (const token of text.split(/\s{2,}|\t/)) {
        const t = token.trim();
        if (t) out.push(t);
      }
    }
    return [...new Set(out)];
  }
}
