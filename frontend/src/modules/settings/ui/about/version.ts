/** Normalize a tag/version for display */
export function formatVersion(raw: string): string {
  return raw.trim().replace(/^v?/i, "v");
}
