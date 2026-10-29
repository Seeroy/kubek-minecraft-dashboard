interface ScanState {
  depth: number;
  multiline: '"""' | "'''" | null;
}

interface Entry {
  key: string;
  start: number;
  end: number;
}

const HEADER = /^\s*\[\[?\s*([^[\]]+?)\s*\]\]?\s*(#.*)?$/;
const BARE_KEY = /^[A-Za-z0-9_-]+$/;

/** TOML literals for values the panel writes */
export const tomlValue = {
  string: (value: string) => JSON.stringify(value),
  bool: (value: boolean) => String(value),
  key: (key: string) => (BARE_KEY.test(key) ? key : JSON.stringify(key)),
  list: (values: string[]) =>
    values.length === 0
      ? "[]"
      : `[\n${values.map((v) => `    ${JSON.stringify(v)}`).join(",\n")}\n]`,
};

// Tracks array depth and multiline strings so headers and keys are only
// recognized outside of values
function scan(line: string, state: ScanState): void {
  let i = 0;
  while (i < line.length) {
    if (state.multiline) {
      const close = line.indexOf(state.multiline, i);
      if (close < 0) return;
      i = close + 3;
      state.multiline = null;
      continue;
    }
    const ch = line[i];
    if (ch === "#") return;
    if (line.startsWith('"""', i) || line.startsWith("'''", i)) {
      state.multiline = line.slice(i, i + 3) as ScanState["multiline"];
      i += 3;
      continue;
    }
    if (ch === '"' || ch === "'") {
      i++;
      while (i < line.length && line[i] !== ch)
        i += ch === '"' && line[i] === "\\" ? 2 : 1;
      i++;
      continue;
    }
    if (ch === "[") state.depth++;
    if (ch === "]") state.depth--;
    i++;
  }
}

function unquote(key: string): string {
  const trimmed = key.trim();
  return /^["'].*["']$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

/**
 * Line based TOML editor: sets top level keys and swaps the entries of one
 * table, every other line keeps its spelling and comments
 */
export class TomlPatcher {
  private constructor(
    private lines: string[],
    private readonly eol: string,
  ) {}

  static parse(text: string): TomlPatcher {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    return new TomlPatcher(text.split(/\r?\n/), eol);
  }

  toString(): string {
    return this.lines.join(this.eol);
  }

  /** Replaces a top level key or adds it after the last top level entry */
  setTopLevel(key: string, literal: string): this {
    const end = this.headers()[0]?.index ?? this.lines.length;
    const entries = this.entries(0, end);
    const line = `${tomlValue.key(key)} = ${literal}`;
    const found = entries.find((entry) => entry.key === key);
    if (found) {
      this.lines.splice(found.start, found.end - found.start + 1, line);
      return this;
    }
    const last = entries[entries.length - 1];
    this.lines.splice(last ? last.end + 1 : 0, 0, line);
    return this;
  }

  /** Replaces a key of a table or adds it after its last entry, a missing table is appended */
  setInTable(name: string, key: string, literal: string): this {
    const headers = this.headers();
    const at = headers.findIndex((header) => header.name === name);
    const line = `${tomlValue.key(key)} = ${literal}`;
    if (at < 0) return this.replaceTable(name, [line]);

    const start = headers[at].index + 1;
    const end = headers[at + 1]?.index ?? this.lines.length;
    const entries = this.entries(start, end);
    const found = entries.find((entry) => entry.key === key);
    if (found) {
      this.lines.splice(found.start, found.end - found.start + 1, line);
      return this;
    }
    const last = entries[entries.length - 1];
    this.lines.splice(last ? last.end + 1 : start, 0, line);
    return this;
  }

  /**
   * Replaces the entries of a table, comments before the first and after the
   * last entry stay in place. A missing table is appended
   */
  replaceTable(name: string, body: string[]): this {
    const headers = this.headers();
    const at = headers.findIndex((header) => header.name === name);
    if (at < 0) {
      while (
        this.lines.length &&
        this.lines[this.lines.length - 1].trim() === ""
      ) {
        this.lines.pop();
      }
      this.lines.push("", `[${name}]`, ...body, "");
      return this;
    }

    const start = headers[at].index + 1;
    const end = headers[at + 1]?.index ?? this.lines.length;
    const entries = this.entries(start, end);
    if (entries.length) {
      const from = entries[0].start;
      const to = entries[entries.length - 1].end;
      this.lines.splice(from, to - from + 1, ...body);
      return this;
    }

    let insert = end;
    while (insert > start && this.lines[insert - 1].trim() === "") insert--;
    this.lines.splice(insert, 0, ...body);
    return this;
  }

  private headers(): { name: string; index: number }[] {
    const out: { name: string; index: number }[] = [];
    const state: ScanState = { depth: 0, multiline: null };
    this.lines.forEach((line, index) => {
      if (state.depth === 0 && !state.multiline) {
        const match = HEADER.exec(line);
        if (match) {
          out.push({ name: unquote(match[1]), index });
          return;
        }
      }
      scan(line, state);
    });
    return out;
  }

  private entries(from: number, to: number): Entry[] {
    const out: Entry[] = [];
    const state: ScanState = { depth: 0, multiline: null };
    let open: Entry | null = null;
    for (let i = from; i < to; i++) {
      const line = this.lines[i];
      const atTop = state.depth === 0 && !state.multiline;
      const trimmed = line.trim();
      if (atTop && trimmed && !trimmed.startsWith("#")) {
        const eq = this.keyOf(line);
        if (eq !== null) open = { key: eq, start: i, end: i };
      }
      scan(line, state);
      if (open && state.depth === 0 && !state.multiline) {
        open.end = i;
        out.push(open);
        open = null;
      }
    }
    return out;
  }

  private keyOf(line: string): string | null {
    const match = /^\s*("(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_.-]+)\s*=/.exec(
      line,
    );
    return match ? unquote(match[1]) : null;
  }
}
