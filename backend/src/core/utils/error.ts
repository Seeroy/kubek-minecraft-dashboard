// Extract a human-readable message from an unknown thrown value
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

// Extract a Node errno code (e.g. "ENOENT") from an unknown thrown value
export function getErrorCode(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return undefined;
}
