import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { ApiError } from "@/shared/lib/http";

const CODES = ["ACCESS_ESCALATION", "ROLE_UNKNOWN", "ROLE_NAME_TAKEN", "ROLE_BUILTIN"];

/** Role and access errors by code, anything else as the API put it */
export function useAccessErrorMessage() {
  const { t } = useTranslation("modules.settings.accessErrors");
  return (error: unknown) => (error instanceof ApiError && CODES.includes(error.code) ? t(error.code) : getApiErrorMessage(error));
}
