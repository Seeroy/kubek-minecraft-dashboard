import type { SecretHint } from "@shared/types/secret.types";

const HINT_LENGTH = 4;
// Short secrets would be mostly revealed by a suffix
const MIN_HINTED_LENGTH = 12;

/** What the API reveals about a stored secret instead of its value */
export function secretHint(value: string | null | undefined): SecretHint {
  if (!value) return { set: false, hint: null };
  return {
    set: true,
    hint: value.length >= MIN_HINTED_LENGTH ? value.slice(-HINT_LENGTH) : null,
  };
}

/** A blank or missing incoming value keeps the stored secret */
export function resolveSecret(
  current: string | undefined,
  incoming: unknown,
): string | undefined {
  return typeof incoming === "string" && incoming.trim() !== ""
    ? incoming
    : current;
}
