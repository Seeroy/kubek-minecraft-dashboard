export type TranslationFunction = (...args: any[]) => string;

// Shared translator signature, the shape returned by useTranslation().t
export type Translator = (key: string, ...args: unknown[]) => string;

export type TranslationValue = string | TranslationFunction;

export type TranslationDictionary = {
  [key: string]: TranslationValue | TranslationDictionary;
};

export interface LanguageDescriptor {
  code: string;
  name: string;
  author: string;
  label: string;
  locale: string;
}

