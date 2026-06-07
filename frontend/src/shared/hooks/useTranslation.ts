import { useLanguageContext } from "@/shared/context/language-context";
import { useCallback } from "react";

export const useTranslation = (namespace?: string) => {
  const { t, ...rest } = useLanguageContext();

  const translate = useCallback(
    (key: string, ...args: any[]) => {
      const path = namespace ? `${namespace}.${key}` : key;
      return t(path, ...args);
    },
    [namespace, t]
  );

  return {
    ...rest,
    t: translate,
  };
};
