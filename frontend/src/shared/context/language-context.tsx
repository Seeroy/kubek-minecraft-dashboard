"use client";

import {
  defaultLanguage,
  LANGUAGE_STORAGE_KEY,
  languageOptions,
  type SupportedLanguage,
  translationResources,
} from "@/locales";
import type { TranslationDictionary, TranslationValue } from "@/locales/types";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface LanguageContextValue {
  language: SupportedLanguage;
  availableLanguages: Array<{
    code: SupportedLanguage;
    label: string;
    locale: string;
  }>;
  setLanguage: (language: SupportedLanguage) => void;
  t: (path: string, ...args: any[]) => string;
  dictionary: TranslationDictionary;
  /** Merge extension flat dictionaries ({ <lang>: { "<key>": "<text>" } }) into t() */
  registerExtensionLocales: (
    bundles: Array<Record<string, Record<string, string>>>
  ) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguageState] =
    useState<SupportedLanguage>(defaultLanguage);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(
      LANGUAGE_STORAGE_KEY
    ) as SupportedLanguage | null;
    if (stored && stored in translationResources) {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = useCallback((nextLanguage: SupportedLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    }
  }, []);

  const dictionary =
    translationResources[language] ?? translationResources[defaultLanguage];

  // Flat key to text dictionaries from installed extensions ("ext.sentinel.title"), kept separate
  // from the core nested dictionary and matched by exact key in t().
  // Stored in a ref so t keeps a stable identity across registrations - many effects/memos list t in their deps. A version counter bumps to
  // re-render consumers once when new locales arrive
  const extLocalesRef = useRef<
    Partial<Record<SupportedLanguage, Record<string, string>>>
  >({});
  const [extLocalesVersion, setExtLocalesVersion] = useState(0);

  const registerExtensionLocales = useCallback(
    (bundles: Array<Record<string, Record<string, string>>>) => {
      const next: Partial<Record<SupportedLanguage, Record<string, string>>> = {
        ...extLocalesRef.current,
      };
      for (const bundle of bundles) {
        for (const [lang, dict] of Object.entries(bundle)) {
          next[lang as SupportedLanguage] = {
            ...(next[lang as SupportedLanguage] ?? {}),
            ...dict,
          };
        }
      }
      extLocalesRef.current = next;
      setExtLocalesVersion((v) => v + 1);
    },
    []
  );

  const availableLanguages = useMemo(
    () =>
      (
        Object.entries(languageOptions) as Array<
          [SupportedLanguage, { label: string; locale: string }]
        >
      ).map(([code, meta]) => ({
        code,
        label: meta.label,
        locale: meta.locale,
      })),
    []
  );

  const resolveTranslation = useCallback(
    (path: string): TranslationValue | TranslationDictionary | undefined => {
      if (!path) return undefined;
      const segments = path.split(".");
      let current: TranslationValue | TranslationDictionary | undefined =
        dictionary;

      for (const segment of segments) {
        if (current && typeof current === "object" && segment in current) {
          current = (current as TranslationDictionary)[segment];
        } else {
          current = undefined;
          break;
        }
      }

      return current;
    },
    [dictionary]
  );

  const translate = useCallback(
    (path: string, ...args: any[]) => {
      const resolved = resolveTranslation(path);

      if (typeof resolved === "function") {
        try {
          return resolved(...args);
        } catch {
          return "NOT TRANSLATED" + path;
        }
      }

      if (typeof resolved === "string") {
        return resolved;
      }

      // Fall back to an extension key before reporting a miss
      const ext = extLocalesRef.current;
      const fromExt = ext[language]?.[path] ?? ext[defaultLanguage]?.[path];
      if (typeof fromExt === "string") {
        return fromExt;
      }

      return "NOT TRANSLATED" + path;
    },
    [resolveTranslation, language]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      availableLanguages,
      setLanguage,
      t: translate,
      dictionary,
      registerExtensionLocales,
    }),
    // extLocalesVersion re-renders consumers when extension locales change, even though
    // translate itself stays referentially stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      language,
      availableLanguages,
      setLanguage,
      translate,
      dictionary,
      registerExtensionLocales,
      extLocalesVersion,
    ]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguageContext must be used within LanguageProvider");
  }
  return context;
};
