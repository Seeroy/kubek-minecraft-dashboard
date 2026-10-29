import { NetworkErrorCode } from "@/api";
import { ApiError } from "@/shared/lib/http";
import type { Translator } from "@/locales/types";

const KNOWN_CODES = new Set<string>(Object.values(NetworkErrorCode));

/** Localized text for a failed network request */
export function networkErrorMessage(error: unknown, t: Translator): string {
  if (error instanceof ApiError) {
    // Name and port codes carry the offending value as the message
    if (KNOWN_CODES.has(error.code)) return t(`errors.${error.code}`, error.message);
    if (/NAME_TAKEN/.test(error.message)) return t("errors.nameTaken");
    if (error.message) return error.message;
  }
  return error instanceof Error && error.message ? error.message : t("errors.generic");
}
