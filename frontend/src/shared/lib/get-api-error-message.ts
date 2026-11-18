import { translateStatic } from "@/locales";
import { ApiError } from "@/shared/lib/http";

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = err.details?.[0];
    return translateStatic(`modules.shared.errors.codes.${err.code}`, detail?.field, detail?.message) ?? err.message;
  }
  if (err instanceof TypeError) return translateStatic("modules.shared.errors.serverUnreachable") ?? "Server unreachable";
  const unexpected = translateStatic("modules.shared.errors.unexpected") ?? "Unexpected error";
  if (err instanceof Error) return err.message || unexpected;
  return unexpected;
}
