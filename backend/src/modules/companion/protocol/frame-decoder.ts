import { isCompanionMessage, type CompanionMessage } from "./messages";
import { verify } from "./signature";

// ESC ] 7768 ; kc1 ; id ; part ; parts ; sig ; chunk BEL
const FRAME_START = "\u001b]7768;";
const FRAME_VERSION = "kc1";
const FRAME_END = "\u0007";
// A frame chunk is at most 3500 chars, anything way longer is not ours
const MAX_FRAME = 8192;
// Half assembled messages kept at once, a stuck one must not grow forever
const MAX_PARTIAL = 32;

/** Drops frames from old output, used for the log tail on adopt */
export function stripFrames(text: string): string {
  // Signatures don't matter here, frames go away either way
  const decoder = new FrameDecoder(() => null);
  return decoder.feed(text).text + decoder.flush();
}

export interface DecodeResult {
  /** Console text with the frames cut out */
  text: string;
  messages: CompanionMessage[];
}

/**
 * Cuts companion frames out of the raw console stream
 * Chunks are arbitrary, so a frame or even its first bytes can be split between them
 */
export class FrameDecoder {
  private carry = "";
  // A frame just ended, its line break may still be on the way
  private afterFrame = false;
  private readonly partial = new Map<string, string[]>();

  constructor(private readonly token: () => string | null) {}

  feed(chunk: string): DecodeResult {
    let data = this.carry + chunk;
    this.carry = "";
    if (this.afterFrame) {
      data = this.dropLineBreak(data);
      if (!data) return { text: "", messages: [] };
    }
    let text = "";
    const messages: CompanionMessage[] = [];

    while (data) {
      const start = data.indexOf(FRAME_START);
      if (start === -1) {
        const keep = partialStart(data);
        text += data.slice(0, data.length - keep);
        this.carry = data.slice(data.length - keep);
        break;
      }
      text += data.slice(0, start);
      const end = data.indexOf(FRAME_END, start);
      if (end === -1) {
        const rest = data.slice(start);
        // Not closing for this long means it's just odd output, give it back
        if (rest.length > MAX_FRAME) text += rest;
        else this.carry = rest;
        break;
      }
      const message = this.frame(data.slice(start + FRAME_START.length, end));
      if (message) messages.push(message);
      this.afterFrame = true;
      data = this.dropLineBreak(data.slice(end + 1));
    }

    return { text, messages };
  }

  /** Whatever was held back waiting for more data */
  flush(): string {
    const rest = this.carry;
    this.carry = "";
    return rest;
  }

  /** New process, nothing from the old one should be glued to it */
  reset(): void {
    this.carry = "";
    this.afterFrame = false;
    this.partial.clear();
  }

  // The plugin ends each frame with LF, a PTY makes it CRLF
  private dropLineBreak(data: string): string {
    if (data === "" || data === "\r") return "";
    this.afterFrame = false;
    if (data.startsWith("\r\n")) return data.slice(2);
    if (data.startsWith("\n")) return data.slice(1);
    return data;
  }

  private frame(body: string): CompanionMessage | null {
    const fields = body.split(";");
    if (fields.length < 6 || fields[0] !== FRAME_VERSION) return null;
    const [, id, partRaw, partsRaw, sig] = fields;
    // The chunk itself never has ';' escaped, so glue the tail back
    const chunk = fields.slice(5).join(";");
    const part = Number(partRaw);
    const parts = Number(partsRaw);
    if (
      !Number.isInteger(part) ||
      !Number.isInteger(parts) ||
      parts < 1 ||
      part >= parts
    ) {
      return null;
    }

    let payload = chunk;
    if (parts > 1) {
      const slots = this.partial.get(id) ?? new Array<string>(parts);
      slots[part] = chunk;
      this.partial.delete(id);
      if (slots.filter((s) => s !== undefined).length < parts) {
        this.partial.set(id, slots);
        if (this.partial.size > MAX_PARTIAL) {
          const oldest = this.partial.keys().next();
          if (!oldest.done) this.partial.delete(oldest.value);
        }
        return null;
      }
      payload = slots.join("");
    }

    const token = this.token();
    if (!token || !verify(token, payload, sig)) return null;
    try {
      const parsed: unknown = JSON.parse(payload);
      return isCompanionMessage(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

// Length of a frame start cut off at the very end of the data
function partialStart(data: string): number {
  const max = Math.min(data.length, FRAME_START.length - 1);
  for (let n = max; n > 0; n--) {
    if (data.endsWith(FRAME_START.slice(0, n))) return n;
  }
  return 0;
}
