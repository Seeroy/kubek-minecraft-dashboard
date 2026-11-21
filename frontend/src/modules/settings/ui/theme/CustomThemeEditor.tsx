"use client";

import { useCustomTheme } from "@/shared/hooks/useCustomTheme";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { type CustomTheme, DEFAULT_CUSTOM_THEME, exportTheme, importTheme } from "@/shared/lib/custom-theme";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Slider } from "@/shared/ui/slider";
import { Textarea } from "@/shared/ui/textarea";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { Check, Download, RotateCcw, SlidersHorizontal, Upload, Wand2 } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { FontPicker } from "./FontPicker";
import { ThemeVarsEditor } from "./ThemeVarsEditor";

type EditorMode = "simple" | "advanced";

const HUE_STOPS = Array.from({ length: 13 }, (_, i) => `oklch(0.7 0.15 ${i * 30})`).join(",");

export function CustomThemeEditor() {
  const { t } = useTranslation("modules.settings.general.theme.editor");
  const { theme, setTheme } = useCustomTheme();
  const [mode, setMode] = useState<EditorMode>("simple");
  const patch = (next: Partial<CustomTheme>) => setTheme((prev) => ({ ...prev, ...next }));

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-subtle p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          variant="segmented"
          className="w-fit"
          value={[mode]}
          onValueChange={(next) => next[0] && setMode(next[0] as EditorMode)}
        >
          <Toggle variant="segmented" value="simple">
            <Wand2 />
            {t("simple")}
          </Toggle>
          <Toggle variant="segmented" value="advanced">
            <SlidersHorizontal />
            {t("advanced")}
          </Toggle>
        </ToggleGroup>
        <div className="flex flex-wrap items-center gap-1">
          <ExportButton theme={theme} />
          <ImportButton onImport={setTheme} />
          <Button variant="ghost" size="sm" onClick={() => setTheme(DEFAULT_CUSTOM_THEME)}>
            <RotateCcw />
            {t("reset")}
          </Button>
        </div>
      </div>

      {mode === "simple" ? (
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <ThemeSlider
            label={t("hue")}
            value={theme.hue}
            max={360}
            display={`${Math.round(theme.hue)}°`}
            track={`linear-gradient(to right,${HUE_STOPS})`}
            onChange={(hue) => patch({ hue })}
          />
          <ThemeSlider
            label={t("tint")}
            value={theme.tint}
            max={1}
            step={0.01}
            display={`${Math.round(theme.tint * 100)}%`}
            track={`linear-gradient(to right,oklch(0.6 0 0),oklch(0.6 0.12 ${theme.hue}))`}
            onChange={(tint) => patch({ tint })}
          />
          <ThemeSlider
            label={t("accentHue")}
            value={theme.accentHue}
            max={360}
            display={`${Math.round(theme.accentHue)}°`}
            track={`linear-gradient(to right,${HUE_STOPS})`}
            onChange={(accentHue) => patch({ accentHue })}
          />
          <ThemeSlider
            label={t("accentChroma")}
            value={theme.accentChroma}
            max={0.3}
            step={0.005}
            display={`${Math.round((theme.accentChroma / 0.3) * 100)}%`}
            track={`linear-gradient(to right,oklch(0.65 0 ${theme.accentHue}),oklch(0.65 0.3 ${theme.accentHue}))`}
            onChange={(accentChroma) => patch({ accentChroma })}
          />
          <div className="grid content-start gap-2">
            <label htmlFor="custom-theme-sans" className="text-[13px] font-medium">
              {t("sans")}
            </label>
            <FontPicker id="custom-theme-sans" kind="sans" value={theme.sans} onChange={(sans) => patch({ sans })} />
          </div>
          <div className="grid content-start gap-2">
            <label htmlFor="custom-theme-mono" className="text-[13px] font-medium">
              {t("mono")}
            </label>
            <FontPicker id="custom-theme-mono" kind="mono" value={theme.mono} onChange={(mono) => patch({ mono })} />
          </div>
          <p className="col-span-full text-[12.5px] text-muted-foreground">{t("fontsNote")}</p>
        </div>
      ) : (
        <ThemeVarsEditor />
      )}
    </div>
  );
}

interface ThemeSliderProps {
  label: string;
  value: number;
  max: number;
  step?: number;
  display: string;
  track: string;
  onChange: (value: number) => void;
}

function ThemeSlider({ label, value, max, step = 1, display, track, onChange }: ThemeSliderProps) {
  return (
    <div className="grid content-start gap-3">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-[12px] text-muted-foreground tabular-nums">{display}</span>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={0}
        max={max}
        step={step}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
        style={{ "--track": track } as CSSProperties}
        className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:[background:var(--track)]"
      />
    </div>
  );
}

function ExportButton({ theme }: { theme: CustomTheme }) {
  const { t } = useTranslation("modules.settings.general.theme.editor");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportTheme(theme));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard needs https or localhost, nothing to do here
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={copy}>
      {copied ? <Check className="text-success" /> : <Upload />}
      {copied ? t("copied") : t("export")}
    </Button>
  );
}

function ImportButton({ onImport }: { onImport: (theme: CustomTheme) => void }) {
  const { t } = useTranslation("modules.settings.general.theme.editor");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);

  const apply = () => {
    const theme = importTheme(text);
    if (!theme) return setInvalid(true);
    onImport(theme);
    setOpen(false);
    setText("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setInvalid(false);
      }}
    >
      <PopoverTrigger render={<Button variant="ghost" size="sm" />}>
        <Download />
        {t("import")}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <Textarea
          autoFocus
          value={text}
          placeholder={t("importPlaceholder")}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setText(e.target.value);
            setInvalid(false);
          }}
          className="max-h-40 font-mono text-[12px] break-all"
        />
        <div className={cn("flex items-center gap-2", invalid ? "justify-between" : "justify-end")}>
          {invalid && <span className="text-[12.5px] text-danger">{t("importInvalid")}</span>}
          <Button size="sm" disabled={!text.trim()} onClick={apply}>
            {t("importApply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
