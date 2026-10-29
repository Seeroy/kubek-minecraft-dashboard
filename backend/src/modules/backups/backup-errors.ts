/** Strips filesystem paths so errors shown to users do not leak the layout */
export function sanitizeBackupError(message: string): string {
  return message
    .replace(/file:\/\/\S*/g, "[REDACTED]")
    .replace(/[A-Za-z]:\\\S+/g, "[REDACTED]")
    .replace(/\/\S+/g, "[REDACTED]")
    .replace(/\\\S+/g, "[REDACTED]")
    .replace(/\.\.\S*/g, "[REDACTED]");
}
