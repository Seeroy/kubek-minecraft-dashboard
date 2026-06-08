"use client";

import type { SupportedLanguage } from "@/locales";
import { ThemePicker } from "@/modules/settings/ui/ThemePicker";
import { useLanguageContext } from "@/shared/context/language-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ThemeSwitch } from "@/shared/ui/ThemeSwitcher/theme-switcher";
import { Languages, Palette, SunMoon } from "lucide-react";

interface PreferencesStepProps {
  onComplete: () => void;
}

export function PreferencesStep({ onComplete }: PreferencesStepProps) {
  const { availableLanguages, language, setLanguage } = useLanguageContext();
  const { t } = useTranslation("modules.oobe.preferencesStep");

  return (
    <div className="space-y-6">
      {/* Color Themes */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("colorTheme.title")}
            title={t("colorTheme.title")}
            description={t("colorTheme.description")}
            icon={Palette}
            color="primary"
          />
        </CardHeader>
        <CardContent>
          <ThemePicker />
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("language.title")}
            title={t("language.title")}
            description={t("language.description")}
            icon={Languages}
            color="blue"
          />
        </CardHeader>
        <CardContent>
          <Select
            items={availableLanguages.map((l) => ({
              label: l.label,
              value: l.code,
            }))}
            value={language}
            onValueChange={(value) => setLanguage(value as SupportedLanguage)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("language.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className={`fi fi-${lang.code} rounded-sm`} />
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Appearance Mode */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("appearance.title")}
            title={t("appearance.title")}
            description={t("appearance.description")}
            icon={SunMoon}
            color="purple"
          />
        </CardHeader>
        <CardContent>
          <ThemeSwitch />
        </CardContent>
      </Card>
    </div>
  );
}
