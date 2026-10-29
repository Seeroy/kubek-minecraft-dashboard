"use client";

import { statsApi } from "@/api/stats";
import { useLanguageContext } from "@/shared/context/language-context";
import { useColorTheme } from "@/shared/hooks/useColorTheme";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

const THEMES = ["light", "dark", "system"] as const;

/** Tells the panel this browser's language and theme for anonymous counts */
const ClientStatsReporter = () => {
  const token = useAuthStore((s) => s.token);
  const { language } = useLanguageContext();
  const { theme } = useTheme();
  const { theme: colorTheme } = useColorTheme();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !THEMES.includes(theme as (typeof THEMES)[number])) return;
    const prefs = {
      language,
      theme: theme as (typeof THEMES)[number],
      colorTheme,
    };
    const key = `${ token }|${ JSON.stringify(prefs) }`;
    if (key === lastSent.current) return;
    lastSent.current = key;
    statsApi.reportClient(prefs).catch(() => {
      // Stats are best effort, retry on the next change
      lastSent.current = null;
    });
  }, [token, language, theme, colorTheme]);

  return null;
};

export default ClientStatsReporter;
