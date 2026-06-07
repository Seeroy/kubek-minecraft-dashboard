/** Sanitize id for safe use as a filesystem path segment */
export function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "_");
}
