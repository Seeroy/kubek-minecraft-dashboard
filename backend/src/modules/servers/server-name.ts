import { BadRequestException } from "@nestjs/common";

export const SERVER_NAME_MAX = 64;

// Names go into config files as is, a line break or a backslash would add lines there
const FORBIDDEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\\]/u;

/** Trimmed name, or a 400 when it's empty, too long or has unsafe characters */
export function assertServerName(name: unknown): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) throw new BadRequestException("Name is required");
  if (trimmed.length > SERVER_NAME_MAX)
    throw new BadRequestException(
      `Server name is longer than ${SERVER_NAME_MAX} characters`,
    );
  if (FORBIDDEN.test(trimmed))
    throw new BadRequestException("Server name contains forbidden characters");
  return trimmed;
}
