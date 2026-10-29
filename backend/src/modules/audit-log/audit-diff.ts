import type { AuditChange } from "@shared/types/audit.types";

type Plain = Record<string, unknown>;

export interface DiffOptions {
  /** Dotted paths whose values never reach the log */
  secrets?: string[];
  /** Dotted paths left out, a parent path skips the whole branch */
  ignore?: string[];
  /** Display names for dotted paths */
  labels?: Record<string, string>;
}

const isPlain = (value: unknown): value is Plain =>
  !!value && typeof value === "object" && !Array.isArray(value);

// A blank string and a missing value read the same in every form
const normalize = (value: unknown) =>
  value === undefined || value === "" ? null : value;

const same = (a: unknown, b: unknown) =>
  JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

/** Changed leaves of two snapshots, objects are walked and arrays compared whole */
export function diffChanges(
  before: unknown,
  after: unknown,
  options: DiffOptions = {},
): AuditChange[] {
  const changes: AuditChange[] = [];
  walk(before, after, "", options, changes);
  return changes;
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  options: DiffOptions,
  out: AuditChange[],
): void {
  if (path && options.ignore?.includes(path)) return;
  if (options.secrets?.includes(path)) {
    if (!same(before, after)) out.push({ field: path, secret: true });
    return;
  }

  const branch =
    (isPlain(before) || isPlain(after)) &&
    (isPlain(before) || before == null) &&
    (isPlain(after) || after == null);
  if (branch) {
    const a = before ?? {};
    const b = after ?? {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      walk(a[key], b[key], path ? `${path}.${key}` : key, options, out);
    }
    return;
  }

  if (same(before, after)) return;
  const label = options.labels?.[path];
  out.push({
    field: path,
    from: normalize(before),
    to: normalize(after),
    ...(label && { label }),
  });
}
