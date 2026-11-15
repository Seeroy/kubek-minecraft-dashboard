const OPEN = "<think>";
const CLOSE = "</think>";

export interface SplitText {
  text: string;
  reasoning: string;
}

/**
 * Pulls a leading <think>...</think> block out of streamed content, some local
 * models put their reasoning there instead of a separate field
 */
export class ThinkSplitter {
  private state: "start" | "thinking" | "answer" = "start";
  private pending = "";

  push(chunk: string): SplitText {
    this.pending += chunk;
    const out: SplitText = { text: "", reasoning: "" };
    for (;;) {
      if (this.state === "start") {
        const trimmed = this.pending.trimStart();
        if (!trimmed) return out;
        if (trimmed.startsWith(OPEN)) {
          this.pending = trimmed.slice(OPEN.length);
          this.state = "thinking";
          continue;
        }
        // Too short to tell yet
        if (OPEN.startsWith(trimmed)) return out;
        this.state = "answer";
      }
      if (this.state === "thinking") {
        const end = this.pending.indexOf(CLOSE);
        if (end >= 0) {
          out.reasoning += this.pending.slice(0, end);
          this.pending = this.pending.slice(end + CLOSE.length).trimStart();
          this.state = "answer";
          continue;
        }
        // Keep a tail that may be the start of the closing tag
        const keep = partialSuffix(this.pending, CLOSE);
        out.reasoning += this.pending.slice(0, this.pending.length - keep);
        this.pending = this.pending.slice(this.pending.length - keep);
        return out;
      }
      out.text += this.pending;
      this.pending = "";
      return out;
    }
  }

  /** Whatever is still held back when the stream ends */
  flush(): SplitText {
    const rest = this.pending;
    this.pending = "";
    return this.state === "thinking"
      ? { text: "", reasoning: rest }
      : { text: rest, reasoning: "" };
  }
}

// Length of the longest end of text that begins tag
function partialSuffix(text: string, tag: string): number {
  for (let n = Math.min(tag.length - 1, text.length); n > 0; n--) {
    if (tag.startsWith(text.slice(-n))) return n;
  }
  return 0;
}
