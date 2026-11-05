// Numeric parts only, "1.2.0-beta" and "v1.2" both read as 1.2.x
function parts(version: string): number[] {
  return (version.match(/\d+/g) ?? []).map(Number);
}

/** Below zero when a is older than b */
export function compareVersions(a: string, b: string): number {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
