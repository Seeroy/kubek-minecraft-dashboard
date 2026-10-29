import { ModpackErrorCode } from "@/api";
import { ApiError } from "@/shared/lib/http";

const KNOWN_CODES = new Set<string>(Object.values(ModpackErrorCode));

/** Localized text for a failed inspect or install */
export function modpackErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError) {
    if (KNOWN_CODES.has(error.code)) return t(`errors.${error.code}`);
    if (/NAME_TAKEN/.test(error.message)) return t("errors.nameTaken");
    if (error.message) return error.message;
  }
  return error instanceof Error && error.message ? error.message : t("errors.generic");
}

/** Same text for a failed background inspect, the task keeps the error code */
export function modpackTaskErrorMessage(error: { code: string; message: string } | undefined, t: (key: string) => string): string {
  if (error && KNOWN_CODES.has(error.code)) return t(`errors.${error.code}`);
  return error?.message || t("errors.generic");
}
