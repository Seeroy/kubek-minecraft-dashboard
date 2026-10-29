// The API speaks plain strings, older clients may still send JSON scalars
export function toPropertyRecord(
  input: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!key || value === undefined || value === null) continue;
    out[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return out;
}

export function propertyFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function propertyPort(value: string | undefined): number | undefined {
  const port = Number.parseInt(value ?? "", 10);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
}
