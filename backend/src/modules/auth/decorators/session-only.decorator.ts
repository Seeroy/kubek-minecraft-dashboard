import { applyDecorators, SetMetadata } from "@nestjs/common";
import { ApiExtension } from "@nestjs/swagger";

export const SESSION_ONLY_KEY = "session_only";

/** Closed to API keys: own account, sessions, 2FA and the keys themselves */
export const SessionOnly = () =>
  applyDecorators(
    SetMetadata(SESSION_ONLY_KEY, true),
    ApiExtension("x-session-only", true),
  );
