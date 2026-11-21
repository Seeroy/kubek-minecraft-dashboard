"use client";

import { useCustomTheme } from "@/shared/hooks/useCustomTheme";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  colorToHex,
  isColorValue,
  resolvePalette,
  THEME_VAR_GROUPS,
  type ThemeMode,
  type ThemeVar,
  type ThemeVarGroup,
} from "@/shared/lib/custom-theme";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { Moon, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

export function ThemeVarsEditor() {
  const { t } = useTranslation("modules.settings.general.theme.editor.vars");
  const { theme, setTheme } = useCustomTheme();
  const { resolvedTheme, setTheme: setMode } = useTheme();
  // Tabs switch the panel mode too, so you edit what you actually see
  const mode: ThemeMode = resolvedTheme === "light" ? "light" : "dark";
  const palette = resolvePalette(theme, mode);
  const overrides = theme.overrides[mode];
  const editedCount = Object.keys(overrides).length;

  const setVar = (name: ThemeVar, value: string | null) =>
    setTheme((prev) => {
      const next = { ...prev.overrides[mode] };
      if (value === null) delete next[name];
      else next[name] = value;
      return { ...prev, overrides: { ...prev.overrides, [mode]: next } };
    });

  const resetMode = () => setTheme((prev) => ({ ...prev, overrides: { ...prev.overrides, [mode]: {} } }));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup variant="segmented" className="w-fit" value={[mode]} onValueChange={(next) => next[0] && setMode(next[0])}>
          <Toggle variant="segmented" value="light">
            <Sun />
            {t("light")}
          </Toggle>
          <Toggle variant="segmented" value="dark">
            <Moon />
            {t("dark")}
          </Toggle>
        </ToggleGroup>
        {editedCount > 0 && (
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            {t("edited", editedCount)}
            <Button variant="ghost" size="sm" onClick={resetMode}>
              <RotateCcw />
              {t("resetMode")}
            </Button>
          </div>
        )}
      </div>
      <p className="text-[12.5px] text-muted-foreground">{t("hint")}</p>

      {(Object.keys(THEME_VAR_GROUPS) as ThemeVarGroup[]).map((group) => (
        <section key={group} className="grid gap-2">
          <h4 className="label-caps">{t(`groups.${group}`)}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {THEME_VAR_GROUPS[group].map((name) => (
              <VarRow
                key={name}
                name={name}
                value={palette[name]}
                edited={name in overrides}
                resetLabel={t("resetVar")}
                onChange={(value) => setVar(name, value)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

interface VarRowProps {
  name: ThemeVar;
  value: string;
  edited: boolean;
  resetLabel: string;
  onChange: (value: string | null) => void;
}

function VarRow({ name, value, edited, resetLabel, onChange }: VarRowProps) {
  const [draft, setDraft] = useState(value);
  // Follow the value when sliders or the mode change it, a remount would close the native picker
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }
  const invalid = draft !== value && !isColorValue(draft);

  const commit = () => {
    const next = draft.trim();
    if (next === value || !isColorValue(next)) return setDraft(value);
    onChange(next);
  };

  return (
    <div
      data-edited={edited || undefined}
      className="flex items-center gap-2 rounded-md border border-border py-1 pr-1 pl-1.5 data-edited:border-primary/40"
    >
      <label
        className="relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-foreground/15"
        style={{ background: value }}
      >
        <input
          type="color"
          aria-label={name}
          value={colorToHex(value) ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <span className="w-[42%] shrink-0 truncate font-mono text-[11.5px] text-muted-foreground" title={`--${name}`}>
        {name}
      </span>
      <Input
        value={draft}
        aria-label={`--${name}`}
        aria-invalid={invalid || undefined}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setDraft(value);
        }}
        className="h-7 min-w-0 flex-1 px-2 font-mono text-[11.5px]"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        title={resetLabel}
        aria-label={resetLabel}
        disabled={!edited}
        onClick={() => onChange(null)}
        className="data-[hidden]:invisible"
        data-hidden={!edited || undefined}
      >
        <RotateCcw />
      </Button>
    </div>
  );
}
