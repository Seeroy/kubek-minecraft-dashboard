type Line =
  | { kind: "text"; raw: string }
  // raw is null once the entry was changed and has to be serialized again
  | { kind: "entry"; key: string; value: string; raw: string | null };

const WHITESPACE = new Set([" ", "\t", "\f"]);
const ESCAPES: Record<string, string> = { t: "\t", n: "\n", r: "\r", f: "\f" };

/**
 * Java .properties file that keeps comments, blank lines, line order and the
 * original spelling of untouched entries
 */
export class PropertiesDocument {
  private constructor(
    private readonly lines: Line[],
    private readonly eol: string,
    private readonly trailingEol: boolean,
  ) {}

  static parse(text: string): PropertiesDocument {
    const eol = /\r\n/.exec(text) ? "\r\n" : "\n";
    const physical = text.split(/\r\n|\n|\r/);
    const trailingEol = text === "" || physical[physical.length - 1] === "";
    if (trailingEol) physical.pop();

    const lines: Line[] = [];
    for (let i = 0; i < physical.length; i++) {
      const first = physical[i];
      const head = first.trimStart();
      if (head === "" || head[0] === "#" || head[0] === "!") {
        lines.push({ kind: "text", raw: first });
        continue;
      }

      const rawParts = [first];
      let logical = head;
      while (endsWithContinuation(logical) && i + 1 < physical.length) {
        i++;
        rawParts.push(physical[i]);
        logical = logical.slice(0, -1) + physical[i].replace(/^[ \t\f]+/, "");
      }
      if (endsWithContinuation(logical)) logical = logical.slice(0, -1);

      const { key, value } = parseEntry(logical);
      lines.push({ kind: "entry", key, value, raw: rawParts.join(eol) });
    }
    return new PropertiesDocument(lines, eol, trailingEol);
  }

  get(key: string): string | undefined {
    return this.lastEntry(key)?.value;
  }

  has(key: string): boolean {
    return this.lastEntry(key) !== undefined;
  }

  keys(): string[] {
    return Object.keys(this.toRecord());
  }

  /** Updates the effective entry in place, unknown keys go to the end */
  set(key: string, value: string): void {
    const entry = this.lastEntry(key);
    if (!entry) {
      this.lines.push({ kind: "entry", key, value, raw: null });
      return;
    }
    if (entry.value === value) return;
    entry.value = value;
    entry.raw = null;
  }

  /** Removes every entry with the key, duplicates included */
  delete(key: string): boolean {
    let removed = false;
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const line = this.lines[i];
      if (line.kind === "entry" && line.key === key) {
        this.lines.splice(i, 1);
        removed = true;
      }
    }
    return removed;
  }

  /** Makes the effective entries equal to the record, keeping what did not change */
  assign(record: Record<string, string>): void {
    for (const key of this.keys()) {
      if (!Object.hasOwn(record, key)) this.delete(key);
    }
    for (const [key, value] of Object.entries(record)) this.set(key, value);
  }

  /** Effective values, a later duplicate wins like in java.util.Properties */
  toRecord(): Record<string, string> {
    const values = new Map<string, string>();
    for (const line of this.lines) {
      if (line.kind === "entry") values.set(line.key, line.value);
    }
    return Object.fromEntries(values);
  }

  toString(): string {
    const body = this.lines
      .map((line) =>
        line.kind === "text"
          ? line.raw
          : (line.raw ?? `${escapeKey(line.key)}=${escapeValue(line.value)}`),
      )
      .join(this.eol);
    return this.trailingEol && this.lines.length > 0 ? body + this.eol : body;
  }

  private lastEntry(key: string) {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const line = this.lines[i];
      if (line.kind === "entry" && line.key === key) return line;
    }
    return undefined;
  }
}

function endsWithContinuation(line: string): boolean {
  let slashes = 0;
  for (let i = line.length - 1; i >= 0 && line[i] === "\\"; i--) slashes++;
  return slashes % 2 === 1;
}

function parseEntry(line: string): { key: string; value: string } {
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === "\\") i += 2;
    else if (c === "=" || c === ":" || WHITESPACE.has(c)) break;
    else i++;
  }
  const key = unescape(line.slice(0, i));

  while (i < line.length && WHITESPACE.has(line[i])) i++;
  if (line[i] === "=" || line[i] === ":") i++;
  while (i < line.length && WHITESPACE.has(line[i])) i++;

  return { key, value: unescape(line.slice(i)) };
}

function unescape(text: string): string {
  if (!text.includes("\\")) return text;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c !== "\\") {
      out += c;
      continue;
    }
    const next = text[++i];
    if (next === undefined) break;
    const hex = next === "u" ? text.slice(i + 1, i + 5) : "";
    if (/^[0-9a-fA-F]{4}$/.test(hex)) {
      out += String.fromCharCode(parseInt(hex, 16));
      i += 4;
    } else {
      out += ESCAPES[next] ?? next;
    }
  }
  return out;
}

function escapeCommon(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f");
}

function escapeKey(key: string): string {
  return escapeCommon(key)
    .replace(/[ =:]/g, (c) => `\\${c}`)
    .replace(/^[#!]/, (c) => `\\${c}`);
}

// Leading spaces would be eaten by the reader, inner ones are kept as is
function escapeValue(value: string): string {
  return escapeCommon(value).replace(/^ /, "\\ ");
}
