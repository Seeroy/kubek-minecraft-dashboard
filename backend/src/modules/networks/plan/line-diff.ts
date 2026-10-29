import type { DiffLine } from "@shared/types/network.types";

type Op = { op: "same" | "add" | "del"; text: string };

// Plain LCS, config files are a few hundred lines at most
function ops(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const table: Uint32Array[] = Array.from(
    { length: n + 1 },
    () => new Uint32Array(m + 1),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const out: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      out.push({ op: "same", text: a[i++] });
      j++;
    } else if (i < n && (j === m || table[i + 1][j] >= table[i][j + 1])) {
      out.push({ op: "del", text: a[i++] });
    } else {
      out.push({ op: "add", text: b[j++] });
    }
  }
  return out;
}

function splitLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Line diff with unchanged runs folded down to a few lines of context */
export function lineDiff(
  before: string,
  after: string,
  context = 3,
): DiffLine[] {
  const all = ops(splitLines(before), splitLines(after));
  const keep = all.map(() => false);
  all.forEach((line, index) => {
    if (line.op === "same") return;
    const from = Math.max(0, index - context);
    const to = Math.min(all.length - 1, index + context);
    for (let k = from; k <= to; k++) keep[k] = true;
  });

  const out: DiffLine[] = [];
  let skipped = 0;
  all.forEach((line, index) => {
    if (keep[index]) {
      if (skipped) out.push({ op: "skip", count: skipped });
      skipped = 0;
      out.push(line);
    } else {
      skipped++;
    }
  });
  if (skipped) out.push({ op: "skip", count: skipped });
  return out;
}
