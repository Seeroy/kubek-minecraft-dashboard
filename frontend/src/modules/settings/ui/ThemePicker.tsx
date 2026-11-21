"use client";

import { useColorTheme } from "@/shared/hooks/useColorTheme";
import { useCustomTheme } from "@/shared/hooks/useCustomTheme";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ColorTheme } from "@/shared/lib/color-theme";
import { cn } from "@/shared/lib/cn";
import { resolvePalette, type ThemeMode } from "@/shared/lib/custom-theme";
import { Check, Pencil } from "lucide-react";
import { useTheme } from "next-themes";
import type { CSSProperties, ReactNode } from "react";

type StockTheme = Exclude<ColorTheme, "custom">;

// Copied from the theme css, its vars only live on <html>
interface Palette {
  bg: string;
  card: string;
  fg: string;
  muted: string;
  primary: string;
  accent: string;
  border: string;
  sidebar: string;
}

const PALETTES: Record<StockTheme, Record<ThemeMode, Palette>> = {
  default: {
    light: { bg: "oklch(0.99 0.002 250)", card: "oklch(1 0 0)", fg: "oklch(0.22 0.01 260)", muted: "oklch(0.54 0.015 260)", primary: "oklch(0.61 0.19 265)", accent: "oklch(0.955 0.02 265)", border: "oklch(0.92 0.005 250)", sidebar: "oklch(0.975 0.003 250)" },
    dark: { bg: "oklch(0.16 0.005 260)", card: "oklch(0.195 0.007 260)", fg: "oklch(0.94 0.005 250)", muted: "oklch(0.7 0.015 260)", primary: "oklch(0.68 0.185 265)", accent: "oklch(0.32 0.1 265)", border: "oklch(1 0 0 / 0.08)", sidebar: "oklch(0.15 0.005 260)" },
  },
  green: {
    light: { bg: "oklch(0.98 0.008 155)", card: "oklch(1 0 0)", fg: "oklch(0.24 0.03 155)", muted: "oklch(0.54 0.03 155)", primary: "oklch(0.6 0.16 155)", accent: "oklch(0.93 0.04 155)", border: "oklch(0.915 0.015 155)", sidebar: "oklch(0.97 0.01 155)" },
    dark: { bg: "oklch(0.15 0.015 155)", card: "oklch(0.195 0.025 155)", fg: "oklch(0.93 0.02 155)", muted: "oklch(0.7 0.03 155)", primary: "oklch(0.74 0.16 155)", accent: "oklch(0.29 0.07 155)", border: "oklch(0.285 0.035 155)", sidebar: "oklch(0.14 0.015 155)" },
  },
  mono: {
    light: { bg: "oklch(0.985 0 0)", card: "oklch(1 0 0)", fg: "oklch(0.2 0 0)", muted: "oklch(0.52 0 0)", primary: "oklch(0.22 0 0)", accent: "oklch(0.94 0 0)", border: "oklch(0.91 0 0)", sidebar: "oklch(0.97 0 0)" },
    dark: { bg: "oklch(0.145 0 0)", card: "oklch(0.185 0 0)", fg: "oklch(0.95 0 0)", muted: "oklch(0.68 0 0)", primary: "oklch(0.95 0 0)", accent: "oklch(0.27 0 0)", border: "oklch(0.27 0 0)", sidebar: "oklch(0.135 0 0)" },
  },
  nether: {
    light: { bg: "oklch(0.982 0.007 35)", card: "oklch(1 0 0)", fg: "oklch(0.24 0.03 35)", muted: "oklch(0.54 0.03 35)", primary: "oklch(0.62 0.15 48)", accent: "oklch(0.935 0.035 48)", border: "oklch(0.915 0.015 35)", sidebar: "oklch(0.97 0.01 35)" },
    dark: { bg: "oklch(0.155 0.014 35)", card: "oklch(0.195 0.02 35)", fg: "oklch(0.93 0.015 35)", muted: "oklch(0.7 0.028 35)", primary: "oklch(0.72 0.15 48)", accent: "oklch(0.29 0.05 48)", border: "oklch(0.285 0.028 35)", sidebar: "oklch(0.14 0.014 35)" },
  },
  cherry: {
    light: { bg: "oklch(0.982 0.007 350)", card: "oklch(1 0 0)", fg: "oklch(0.24 0.03 350)", muted: "oklch(0.54 0.03 350)", primary: "oklch(0.62 0.13 355)", accent: "oklch(0.935 0.035 355)", border: "oklch(0.915 0.015 350)", sidebar: "oklch(0.97 0.01 350)" },
    dark: { bg: "oklch(0.155 0.014 350)", card: "oklch(0.195 0.02 350)", fg: "oklch(0.93 0.015 350)", muted: "oklch(0.7 0.028 350)", primary: "oklch(0.72 0.13 355)", accent: "oklch(0.29 0.05 355)", border: "oklch(0.285 0.028 350)", sidebar: "oklch(0.14 0.014 350)" },
  },
};

export const COLOR_THEMES: { id: StockTheme; name: string }[] = [
  { id: "default", name: "Kubek" },
  { id: "green", name: "Green" },
  { id: "mono", name: "Mono" },
  { id: "nether", name: "Nether" },
  { id: "cherry", name: "Cherry" },
];

const paletteVars = (p: Palette) =>
  ({
    "--t-bg": p.bg,
    "--t-card": p.card,
    "--t-fg": p.fg,
    "--t-muted": p.muted,
    "--t-primary": p.primary,
    "--t-accent": p.accent,
    "--t-border": p.border,
    "--t-sidebar": p.sidebar,
  }) as CSSProperties;

export function ThemePicker({ className }: { className?: string }) {
  const { t } = useTranslation("modules.settings.general.theme");
  const { theme, setTheme } = useColorTheme();
  const { theme: custom } = useCustomTheme();
  const { resolvedTheme } = useTheme();
  const mode: ThemeMode = resolvedTheme === "light" ? "light" : "dark";
  const customPalette = resolvePalette(custom, mode);

  return (
    <div className={cn("@container", className)}>
      <div role="radiogroup" className="grid grid-cols-2 gap-3 @md:grid-cols-3 @5xl:grid-cols-6">
        {COLOR_THEMES.map(({ id, name }) => (
          <ThemeCard key={id} name={name} selected={theme === id} palette={PALETTES[id][mode]} onSelect={() => setTheme(id)}>
            <MiniPanel />
          </ThemeCard>
        ))}
        <ThemeCard
          name={t("custom")}
          font={custom.sans ? `"${custom.sans.family}", var(--font-onest)` : undefined}
          selected={theme === "custom"}
          palette={{
            bg: customPalette.background,
            card: customPalette.card,
            fg: customPalette.foreground,
            muted: customPalette["muted-foreground"],
            primary: customPalette.primary,
            accent: customPalette.accent,
            border: customPalette.border,
            sidebar: customPalette.sidebar,
          }}
          onSelect={() => setTheme("custom")}
        >
          <CustomPreview />
        </ThemeCard>
      </div>
    </div>
  );
}

interface ThemeCardProps {
  name: string;
  font?: string;
  selected: boolean;
  palette: Palette;
  onSelect: () => void;
  children: ReactNode;
}

function ThemeCard({ name, font, selected, palette, onSelect, children }: ThemeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      style={paletteVars(palette)}
      className="group relative isolate h-[104px] cursor-pointer overflow-hidden rounded-lg border border-border text-left transition-[border-color,translate,box-shadow] duration-150 outline-none hover:-translate-y-px focus-visible:ring-3 focus-visible:ring-primary/30 not-aria-checked:hover:border-foreground/20 aria-checked:border-(--t-primary) aria-checked:shadow-[0_0_0_1px_var(--t-primary),0_10px_28px_-8px_color-mix(in_oklch,var(--t-primary)_75%,transparent)]"
    >
      {children}
      <span
        className="absolute inset-x-0 bottom-0 z-2 truncate px-2.5 pt-7 pb-2 text-[12.5px] font-semibold text-(--t-fg)"
        style={{
          fontFamily: font,
          background:
            "linear-gradient(to top, var(--t-bg) 28%, color-mix(in oklch, var(--t-bg) 70%, transparent) 60%, transparent)",
        }}
      >
        {name}
      </span>
      {selected && (
        <span className="absolute top-1.5 right-1.5 z-3 grid size-5 animate-pop-in place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_2px_oklch(1_0_0/0.9),0_2px_6px_oklch(0_0_0/0.3)]">
          <Check className="size-3" strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}

const SIDEBAR_ITEM = "h-[5px] rounded-[3px] bg-[color-mix(in_oklch,var(--t-fg)_22%,transparent)]";

function MiniPanel() {
  return (
    <span className="absolute inset-0 grid grid-rows-[13px_1fr] bg-(--t-bg)">
      <span className="flex items-center gap-1 border-b border-(--t-border) bg-(--t-sidebar) px-1.5">
        <i className="size-1.5 rounded-[2px] bg-(--t-primary)" />
        <i className="h-[3px] w-4.5 rounded-full bg-(--t-muted) opacity-60" />
        <i className="h-[3px] w-4.5 rounded-full bg-(--t-muted) opacity-60" />
      </span>
      <span className="grid min-h-0 grid-cols-[30%_1fr]">
        <span className="grid content-start gap-[5px] border-r border-(--t-border) bg-(--t-sidebar) px-[5px] py-2">
          <i className="h-[5px] rounded-[3px] bg-(--t-accent) shadow-[inset_2px_0_0_var(--t-primary)]" />
          <i className={SIDEBAR_ITEM} />
          <i className={SIDEBAR_ITEM} />
          <i className={SIDEBAR_ITEM} />
        </span>
        <span className="grid min-h-0 grid-rows-[auto_1fr] gap-[5px] p-1.5">
          <span className="grid grid-cols-2 gap-[5px]">
            <StatTile />
            <StatTile />
          </span>
          <Sparkline />
        </span>
      </span>
    </span>
  );
}

function StatTile() {
  return (
    <span className="grid gap-[3px] rounded-[4px] border border-(--t-border) bg-(--t-card) p-1">
      <i className="h-[3px] w-3/5 rounded-full bg-(--t-muted)" />
      <i className="h-[5px] w-2/5 rounded-full bg-(--t-fg)" />
    </span>
  );
}

const CHART = "M0 30 L10 26 L20 28 L30 18 L40 21 L50 12 L60 15 L70 8 L80 11 L90 5 L100 7";

function Sparkline() {
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="block size-full" aria-hidden>
      <path d={`${CHART} L100 36 L0 36 Z`} style={{ fill: "var(--t-primary)", opacity: 0.18 }} />
      <path
        d={CHART}
        fill="none"
        style={{ stroke: "var(--t-primary)" }}
        strokeWidth={1.6}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const BLOCK_COUNT = 96;
const blockColor = (i: number, lightness: number[], chroma: number) =>
  `oklch(${lightness[(i * 7) % lightness.length]} ${chroma} ${(i * 137) % 360})`;

const HALVES = [
  { clip: "polygon(0 0, 100% 0, 0 100%)", bg: "oklch(0.97 0.01 280)", lightness: [0.82, 0.88, 0.92, 0.85], chroma: 0.09 },
  { clip: "polygon(100% 0, 100% 100%, 0 100%)", bg: "oklch(0.17 0.01 280)", lightness: [0.32, 0.4, 0.28, 0.45], chroma: 0.12 },
];

const BLUR_LAYERS = [
  { blur: 1.5, mask: "radial-gradient(ellipse closest-side, #000 30%, transparent 100%)" },
  { blur: 4, mask: "radial-gradient(ellipse closest-side, #000 15%, transparent 75%)" },
  { blur: 8, mask: "radial-gradient(ellipse closest-side, #000 0%, transparent 50%)" },
];

function CustomPreview() {
  return (
    <span className="absolute inset-0">
      {HALVES.map(({ clip, bg, lightness, chroma }) => (
        <span
          key={clip}
          className="absolute inset-0 grid auto-rows-[14px] grid-cols-[repeat(auto-fill,14px)] content-start justify-center gap-[3px] p-[3px]"
          style={{ clipPath: clip, background: bg }}
        >
          {Array.from({ length: BLOCK_COUNT }, (_, i) => (
            <i
              key={i}
              className="rounded-[3px] shadow-[inset_0_1px_0_oklch(1_0_0/0.22)]"
              style={{ background: blockColor(i, lightness, chroma) }}
            />
          ))}
        </span>
      ))}
      {BLUR_LAYERS.map(({ blur, mask }) => (
        <span
          key={blur}
          className="absolute inset-0"
          style={{ backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`, maskImage: mask, WebkitMaskImage: mask }}
        />
      ))}
      <span className="absolute inset-x-0 top-0 bottom-6 grid place-items-center">
        <span className="grid size-7 place-items-center rounded-full border border-white/45 bg-white/30 text-white shadow-[0_2px_8px_oklch(0_0_0/0.25)] backdrop-blur-sm transition-transform duration-200 ease-smooth group-hover:-rotate-12 group-hover:scale-110">
          <Pencil className="size-3.5 drop-shadow-[0_1px_1px_oklch(0_0_0/0.35)]" />
        </span>
      </span>
    </span>
  );
}
