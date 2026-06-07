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

