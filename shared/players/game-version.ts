/** Release from a status query version like "Paper 1.21.4" or "26.1" */
export function parseGameVersion(
  text: string | undefined,
): [number, number] | null {
  const match = text?.match(/(?:^|[^\d.])(\d+)\.(\d+)(?:\.\d+)?(?![\d.])/);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

/** 1.8 to 1.12 have no effect give and no execute in, unknown counts as modern */
export function usesLegacyCommands(text: string | undefined): boolean {
  const version = parseGameVersion(text);
  return !!version && version[0] === 1 && version[1] < 13;
}
