import { usTranslations } from "./en";
import { ruTranslations } from "./ru";
import type { LanguageDescriptor, TranslationDictionary } from "./types";

export const LANGUAGE_STORAGE_KEY = "kubek:lastLanguage";

export const translationResources = {
  us: usTranslations,
  ru: ruTranslations,
} satisfies Record<string, TranslationDictionary>;

export type SupportedLanguage = keyof typeof translationResources;

export const defaultLanguage: SupportedLanguage = "us";

export const languageOptions: Record<SupportedLanguage, LanguageDescriptor> = {
  us: {
    code: "us",
    name: "English",
    author: "Seeroy",
    label: "English",
    locale: "en-US",
  },
  ru: {
    code: "ru",
    name: "Русский",
    author: "Seeroy",
    label: "Русский",
    locale: "ru-RU",
  },
};

// for code outside React, like toasts
let activeLanguage: SupportedLanguage = defaultLanguage;

export function setActiveLanguage(language: SupportedLanguage): void {
  activeLanguage = language;
}

export function translateStatic(path: string, ...args: unknown[]): string | undefined {
  let current: TranslationDictionary[string] | undefined = translationResources[activeLanguage];
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object" || !(segment in current)) return undefined;
    current = current[segment];
  }
  if (typeof current === "string") return current;
  if (typeof current === "function") return current(...args);
  return undefined;
}
