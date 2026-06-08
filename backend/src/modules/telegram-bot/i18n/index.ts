import type { TelegramLang } from "@/modules/telegram-bot/telegram.types";
import { en } from "./en";
import { ru } from "./ru";

export type { TelegramLang };
export const SUPPORTED_LANGS: TelegramLang[] = ["en", "ru"];

const DICTS: Record<TelegramLang, typeof en> = { en, ru };

/** Map a Telegram client "language_code" to a supported bot language */
export function detectLang(code?: string | null): TelegramLang {
  return code && code.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function resolvePath(dict: unknown, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (acc, seg) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[seg]
          : undefined,
      dict,
    );
}

/**
 * Translate "key" (dot path) for "lang", falling back to English
 */
export function t(
  lang: TelegramLang,
  key: string,
  params?: Record<string, unknown>,
): string {
  const value =
    resolvePath(DICTS[lang] ?? DICTS.en, key) ?? resolvePath(DICTS.en, key);
  if (typeof value === "function") return value(params ?? {}) as string;
  if (typeof value === "string") return value;
  return key;
}
