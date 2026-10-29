"use client";

import type { SupportedLanguage } from "@/locales";
import { AutosaveSkinNameInput } from "@/modules/settings/ui/SkinNameInput";
import { ThemePicker } from "@/modules/settings/ui/ThemePicker";
import { useLanguageContext } from "@/shared/context/language-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { LanguageFlag } from "@/shared/ui/LanguageFlag";
import { Plate } from "@/shared/ui/plate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import type { Tone } from "@/shared/ui/tone";
import { Gamepad2, Globe, type LucideIcon, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

const MODES = [
  { id: "dark", icon: Moon },
  { id: "light", icon: Sun },
] as const;

function Section({ icon: Icon, tone, title, description, children }: { icon: LucideIcon; tone: Tone; title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3 gap-y-1 not-last:mb-5">
      <Plate tone={tone} className="row-span-2">
        <Icon />
      </Plate>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-[12.5px] text-muted-foreground">{description}</p>
      <div className="col-start-2 mt-3">{children}</div>
    </section>
  );
}

export function PreferencesStep() {
  const { t } = useTranslation("modules.oobe.preferences");
  const { t: ts } = useTranslation("modules.settings.general.theme.modes");
  const { availableLanguages, language, setLanguage } = useLanguageContext();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <>
      <Section icon={Palette} tone="purple" title={t("theme.title")} description={t("theme.description")}>
        <ThemePicker />
      </Section>
      <Section icon={Globe} tone="blue" title={t("language.title")} description={t("language.description")}>
        <Select<SupportedLanguage> value={language} onValueChange={(value) => value && setLanguage(value)}>
          <SelectTrigger className="w-full sm:w-64" aria-label={t("language.title")}>
            <SelectValue>
              {(value: SupportedLanguage) => {
                const current = availableLanguages.find((lang) => lang.code === value);
                return current ? (
                  <>
                    <LanguageFlag code={current.code} />
                    {current.label}
                  </>
                ) : null;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <LanguageFlag code={lang.code} />
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>
      <Section icon={resolvedTheme === "light" ? Sun : Moon} tone="amber" title={t("appearance.title")} description={t("appearance.description")}>
        <ToggleGroup variant="segmented" value={resolvedTheme ? [resolvedTheme] : []} onValueChange={(next) => next[0] && setTheme(next[0])}>
          {MODES.map(({ id, icon: Icon }) => (
            <Toggle key={id} variant="segmented" value={id}>
              <Icon />
              {ts(id)}
            </Toggle>
          ))}
        </ToggleGroup>
      </Section>
      <Section icon={Gamepad2} tone="green" title={t("skin.title")} description={t("skin.description")}>
        <AutosaveSkinNameInput className="w-full sm:w-64" />
      </Section>
    </>
  );
}
