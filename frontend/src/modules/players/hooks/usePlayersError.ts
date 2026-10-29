import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { ApiError } from "@/shared/lib/http";

// Codes the players API answers with, translated on the client
const CODES = new Set([
  "PLAYER_NOT_FOUND",
  "MOJANG_UNAVAILABLE",
  "SERVER_NOT_RUNNING",
  "SERVER_BUSY",
  "PLAYERS_NEEDS_STOPPED_SERVER",
  "PLAYERS_APPLY_TIMEOUT",
  "PLAYERS_UNSUPPORTED",
]);

export function usePlayersError() {
  const { t } = useTranslation("modules.players.errors");
  return (error: unknown) => (error instanceof ApiError && CODES.has(error.code) ? t(error.code) : getApiErrorMessage(error));
}
