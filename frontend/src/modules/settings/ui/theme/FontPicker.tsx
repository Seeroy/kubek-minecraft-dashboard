"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { ThemeFont } from "@/shared/lib/custom-theme";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Spinner } from "@/shared/ui/spinner";
import { Check, ChevronsUpDown, Plus, WifiOff } from "lucide-react";
import { type CSSProperties, type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { type GoogleFont, useGoogleFontsQuery } from "../../api/google-fonts.queries";

type FontKind = "sans" | "mono";

const WANTED_WEIGHTS: Record<FontKind, number[]> = {
  sans: [400, 500, 600, 700],
  mono: [400, 500, 600],
};
const STOCK_VAR: Record<FontKind, string> = { sans: "--font-onest", mono: "--font-jetbrains-mono" };
const LIMIT = 80;

export const fontFamilyCss = (font: ThemeFont | null, kind: FontKind) =>
  font ? `"${font.family}", var(${STOCK_VAR[kind]})` : `var(${STOCK_VAR[kind]})`;

// Only the weights the panel uses, Google rejects the whole request for a missing one
function toThemeFont(font: GoogleFont, kind: FontKind): ThemeFont {
  const weights = WANTED_WEIGHTS[kind].filter((w) => font.weights.includes(w));
  return { family: font.family, weights: weights.length ? weights : undefined };
}

interface FontPickerProps {
  kind: FontKind;
  value: ThemeFont | null;
  onChange: (font: ThemeFont | null) => void;
  id?: string;
}

export function FontPicker({ kind, value, onChange, id }: FontPickerProps) {
  const { t } = useTranslation("modules.settings.general.theme.editor.font");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cyrillicOnly, setCyrillicOnly] = useState(true);
  const [monoOnly, setMonoOnly] = useState(kind === "mono");
  const query = useGoogleFontsQuery(open);
  const deferredSearch = useDeferredValue(search);

  const typed = search.trim();
  const validTyped = /^[\w -]{1,60}$/.test(typed);

  const matches = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    const list = (query.data ?? []).filter(
      (font) =>
        (!cyrillicOnly || font.subsets.includes("cyrillic")) &&
        (!monoOnly || font.category === "monospace") &&
        (!needle || font.family.toLowerCase().includes(needle)),
    );
    // Prefix matches first, the rest keep the catalog order
    if (needle) list.sort((a, b) => +!a.family.toLowerCase().startsWith(needle) - +!b.family.toLowerCase().startsWith(needle));
    return list.slice(0, LIMIT);
  }, [query.data, deferredSearch, cyrillicOnly, monoOnly]);

  const exact = matches.some((font) => font.family.toLowerCase() === typed.toLowerCase());

  const pick = (font: ThemeFont | null) => {
    onChange(font);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="grid gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button id={id} variant="outline" className="w-full justify-between font-normal" />}>
          <span className="truncate" style={{ fontFamily: fontFamilyCss(value, kind) }}>
            {value?.family ?? t("stock")}
          </span>
          <ChevronsUpDown className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 gap-2 p-2">
          <Input
            autoFocus
            value={search}
            placeholder={t("search")}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const target = matches.find((font) => font.family.toLowerCase() === typed.toLowerCase()) ?? matches[0];
              if (target) pick(toThemeFont(target, kind));
              else if (validTyped) pick({ family: typed });
            }}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[12.5px] text-muted-foreground">
            <label className="flex cursor-pointer items-center gap-1.5">
              <Checkbox checked={cyrillicOnly} onCheckedChange={(checked) => setCyrillicOnly(!!checked)} />
              {t("cyrillic")}
            </label>
            {kind === "mono" && (
              <label className="flex cursor-pointer items-center gap-1.5">
                <Checkbox checked={monoOnly} onCheckedChange={(checked) => setMonoOnly(!!checked)} />
                {t("monoOnly")}
              </label>
            )}
          </div>

          <div role="listbox" className="-mx-1 grid max-h-72 overflow-y-auto px-1">
            <FontOption selected={!value} onClick={() => pick(null)} style={{ fontFamily: fontFamilyCss(null, kind) }}>
              {t("stock")}
            </FontOption>
            {validTyped && !exact && (
              <FontOption onClick={() => pick({ family: typed })}>
                <Plus className="size-3.5 text-muted-foreground" />
                {t("use", typed)}
              </FontOption>
            )}
            {query.isPending && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
            {query.isError && (
              <p className="flex items-start gap-2 px-2 py-3 text-[12.5px] text-muted-foreground">
                <WifiOff className="mt-0.5 size-3.5 shrink-0" />
                {t("offline")}
              </p>
            )}
            {query.isSuccess && !matches.length && !validTyped && (
              <p className="px-2 py-3 text-[12.5px] text-muted-foreground">{t("empty")}</p>
            )}
            {matches.map((font) => (
              <FontOption key={font.family} selected={value?.family === font.family} onClick={() => pick(toThemeFont(font, kind))}>
                <span className="truncate">{font.family}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{font.category}</span>
              </FontOption>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <p className="truncate text-[13px] text-muted-foreground" style={{ fontFamily: fontFamilyCss(value, kind) }}>
          {t("sample")}
        </p>
      )}
    </div>
  );
}

function FontOption({
  selected,
  onClick,
  style,
  children,
}: {
  selected?: boolean;
  onClick: () => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={!!selected}
      onClick={onClick}
      style={style}
      className={cn(
        "flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-[13px] outline-none hover:bg-hover focus-visible:bg-hover",
        selected && "font-medium text-primary",
      )}
    >
      {children}
      {selected && <Check className="ml-auto size-3.5 shrink-0" />}
    </button>
  );
}
