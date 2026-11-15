"use client";
import { languageOptions } from "@/locales";
import { useLanguageContext } from "@/shared/context/language-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { AssistantUsage } from "@shared/types/assistant.types";
import { useAssistantStatus } from "../api/assistant.queries";

/** "12.3K tokens · 0.042 ₽", rubles for Russian when the rate is known, dollars otherwise */
export function useUsageFormat() {
  const { language } = useLanguageContext();
  const { t } = useTranslation("modules.assistant.usage");
  const status = useAssistantStatus().data;
  const locale = languageOptions[language].locale;
  const rate = language === "ru" ? status?.usdRub : null;
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const exact = new Intl.NumberFormat(locale);

  const money = (usd: number) => {
    const value = rate ? usd * rate : usd;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: rate ? "RUB" : "USD",
      // Requests cost fractions of a cent, keep two meaningful digits
      ...(value >= 1 || value === 0 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 2 }),
    }).format(value);
  };

  const tokens = (usage: AssistantUsage) => {
    const total = usage.promptTokens + usage.completionTokens;
    return t("tokens", total, compact.format(total));
  };

  /** Free local models show tokens only */
  const label = (usage: AssistantUsage) =>
    usage.costUsd === null || status?.local ? tokens(usage) : `${tokens(usage)} · ${money(usage.costUsd)}`;

  /** Money alone when it is known, tokens otherwise */
  const short = (usage: AssistantUsage) => (usage.costUsd === null || status?.local ? tokens(usage) : money(usage.costUsd));

  const details = (usage: AssistantUsage) => {
    const base = t("details", exact.format(usage.promptTokens), exact.format(usage.completionTokens));
    return usage.cachedTokens ? `${base}\n${t("cached", exact.format(usage.cachedTokens))}` : base;
  };

  return { label, short, details };
}
