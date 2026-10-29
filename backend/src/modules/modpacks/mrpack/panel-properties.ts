// Keys the panel owns, a pack must not move the server to another port
export const PANEL_PROPERTY_KEYS = [
  "server-port",
  "query.port",
  "enable-query",
];

function keyOf(line: string): string | undefined {
  const trimmed = line.trimStart();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) {
    return undefined;
  }
  const match = /^([^=:\s]+)\s*[=:]/.exec(trimmed);
  return match?.[1];
}

/**
 * Put the panel's own lines back into a server.properties that an override
 * replaced, every other line of the override stays as written
 */
export function restorePanelProperties(
  overridden: string,
  original: string,
  keys: readonly string[] = PANEL_PROPERTY_KEYS,
): string {
  const originalLines = new Map<string, string>();
  for (const line of original.split(/\r?\n/)) {
    const key = keyOf(line);
    if (key && keys.includes(key)) originalLines.set(key, line.trim());
  }

  const placed = new Set<string>();
  const lines = overridden.split(/\r?\n/).map((line) => {
    const key = keyOf(line);
    const panelLine = key ? originalLines.get(key) : undefined;
    if (!key || panelLine === undefined) return line;
    placed.add(key);
    return panelLine;
  });

  const missing = [...originalLines]
    .filter(([key]) => !placed.has(key))
    .map(([, line]) => line);
  if (missing.length === 0) return lines.join("\n");

  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return [...lines, ...missing, ""].join("\n");
}
