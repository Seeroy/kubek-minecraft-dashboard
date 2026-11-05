import type {
  CompanionEvent,
  CompanionHello,
  CompanionStats,
} from "@shared/types/companion.types";

/** Everything the plugin can send, already verified and parsed */
export type CompanionMessage =
  | ({ t: "hello"; ts: number } & CompanionHello)
  | { t: "ready"; ts: number }
  | ({ t: "stats" } & CompanionStats)
  | { t: "events"; ts: number; items: CompanionEvent[]; dropped?: number }
  | {
      t: "result";
      id: string;
      ok: boolean;
      error?: string;
      data?: unknown;
    }
  | { t: "stopping"; ts: number };

const KNOWN = new Set([
  "hello",
  "ready",
  "stats",
  "events",
  "result",
  "stopping",
]);

export function isCompanionMessage(value: unknown): value is CompanionMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { t?: unknown }).t;
  return typeof type === "string" && KNOWN.has(type);
}
