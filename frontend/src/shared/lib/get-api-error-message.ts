import { ApiError } from "@/shared/lib/http";

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return "Server unreachable";
  if (err instanceof Error) return err.message || "Unexpected error";
  return "Unexpected error";
}
