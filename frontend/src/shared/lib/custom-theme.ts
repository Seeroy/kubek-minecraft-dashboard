import { z } from "zod";

export type ThemeMode = "light" | "dark";

// The advanced editor shows them in this order
export const THEME_VAR_GROUPS = {
  base: ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground"],
  accent: ["primary", "primary-foreground", "ring", "accent", "accent-foreground"],
  neutral: ["secondary", "secondary-foreground", "muted", "muted-foreground", "border", "input"],
  status: ["destructive", "destructive-foreground", "success", "warn"],
  sidebar: [
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
  ],
  chart: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
} as const;

export type ThemeVarGroup = keyof typeof THEME_VAR_GROUPS;
export type ThemeVar = (typeof THEME_VAR_GROUPS)[ThemeVarGroup][number];
export const THEME_VARS = Object.values(THEME_VAR_GROUPS).flat() as ThemeVar[];

// A var follows its source until the user sets it on its own
const LINKS: [ThemeVar, ThemeVar][] = [
  ["card-foreground", "foreground"],
  ["popover-foreground", "foreground"],
  ["ring", "primary"],
  ["sidebar-primary", "primary"],
  ["sidebar-ring", "primary"],
  ["sidebar-primary-foreground", "primary-foreground"],
];

// Plain color syntax only, the value lands inside a <style> tag
const COLOR_VALUE = /^[a-z0-9#%.,()\s/+-]{1,80}$/i;
const FONT_FAMILY = /^[\w -]{1,60}$/;

export const isColorValue = (value: string) =>
  COLOR_VALUE.test(value.trim()) && (typeof CSS === "undefined" || CSS.supports("color", value.trim()));

const fontSchema = z.object({
  family: z.string().trim().regex(FONT_FAMILY),
  weights: z.array(z.number().int().min(100).max(900)).max(9).optional(),
});

const overridesSchema = z.partialRecord(z.enum(THEME_VARS as [ThemeVar, ...ThemeVar[]]), z.string().trim().regex(COLOR_VALUE));

export const customThemeSchema = z.object({
  hue: z.number().min(0).max(360),
  tint: z.number().min(0).max(1),
  accentHue: z.number().min(0).max(360),
  accentChroma: z.number().min(0).max(0.3),
  sans: fontSchema.nullable(),
  mono: fontSchema.nullable(),
  overrides: z.object({ light: overridesSchema, dark: overridesSchema }),
});

export type ThemeFont = z.infer<typeof fontSchema>;
export type CustomTheme = z.infer<typeof customThemeSchema>;
export type ThemePalette = Record<ThemeVar, string>;

// Matches the stock Kubek look, a fair place to start tweaking from
export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  hue: 260,
  tint: 0.25,
  accentHue: 265,
  accentChroma: 0.19,
  sans: null,
  mono: null,
  overrides: { light: {}, dark: {} },
};

const round = (value: number) => Math.round(value * 1000) / 1000;
const ok = (l: number, c: number, h: number) => `oklch(${round(l)} ${round(c)} ${round(h)})`;
const WHITE = "oklch(1 0 0)";

export function generatePalette(theme: CustomTheme, mode: ThemeMode): ThemePalette {
  const { hue: h, accentHue: ah, accentChroma: a } = theme;
  // tint 0.5 gives about the chroma of the stock colored themes
  const n = (c: number) => c * theme.tint * 2;
  const chartAccent = Math.max(a, 0.15);

  if (mode === "light") {
    const fg = ok(0.24, n(0.03), h);
    const primary = ok(0.6, a, ah);
    const border = ok(0.915, n(0.015), h);
    return {
      background: ok(0.982, n(0.007), h),
      foreground: fg,
      card: WHITE,
      "card-foreground": fg,
      popover: WHITE,
      "popover-foreground": fg,
      primary,
      "primary-foreground": WHITE,
      ring: primary,
      accent: ok(0.935, a * 0.27, ah),
      "accent-foreground": ok(0.38, a * 0.9, ah),
      secondary: ok(0.955, n(0.02), h),
      "secondary-foreground": ok(0.36, a * 0.6, ah),
      muted: ok(0.965, n(0.012), h),
      "muted-foreground": ok(0.54, n(0.03), h),
      border,
      input: ok(0.93, n(0.015), h),
      destructive: "oklch(0.64 0.21 25)",
      "destructive-foreground": WHITE,
      success: "oklch(0.62 0.15 155)",
      warn: "oklch(0.7 0.15 70)",
      sidebar: ok(0.97, n(0.01), h),
      "sidebar-foreground": ok(0.27, n(0.03), h),
      "sidebar-primary": primary,
      "sidebar-primary-foreground": WHITE,
      "sidebar-accent": ok(0.93, a * 0.27, ah),
      "sidebar-accent-foreground": ok(0.38, a * 0.9, ah),
      "sidebar-border": border,
      "sidebar-ring": primary,
      "chart-1": "oklch(0.7 0.15 200)",
      "chart-2": ok(0.65, chartAccent, ah),
      "chart-3": "oklch(0.77 0.17 130)",
      "chart-4": "oklch(0.77 0.15 70)",
      "chart-5": "oklch(0.68 0.2 15)",
    };
  }

  const fg = ok(0.93, n(0.015), h);
  const primary = ok(0.72, a, ah);
  const primaryFg = ok(0.17, n(0.02), ah);
  const accentFg = ok(0.93, a * 0.3, ah);
  return {
    background: ok(0.155, n(0.014), h),
    foreground: fg,
    card: ok(0.195, n(0.02), h),
    "card-foreground": fg,
    popover: ok(0.21, n(0.022), h),
    "popover-foreground": fg,
    primary,
    "primary-foreground": primaryFg,
    ring: primary,
    accent: ok(0.29, a * 0.38, ah),
    "accent-foreground": accentFg,
    secondary: ok(0.24, n(0.028), h),
    "secondary-foreground": ok(0.9, n(0.025), h),
    muted: ok(0.22, n(0.02), h),
    "muted-foreground": ok(0.7, n(0.028), h),
    border: ok(0.285, n(0.028), h),
    input: ok(0.265, n(0.028), h),
    destructive: "oklch(0.68 0.2 25)",
    "destructive-foreground": WHITE,
    success: "oklch(0.74 0.16 155)",
    warn: "oklch(0.8 0.15 75)",
    sidebar: ok(0.14, n(0.014), h),
    "sidebar-foreground": ok(0.9, n(0.025), h),
    "sidebar-primary": primary,
    "sidebar-primary-foreground": primaryFg,
    "sidebar-accent": ok(0.27, a * 0.35, ah),
    "sidebar-accent-foreground": accentFg,
    "sidebar-border": ok(0.255, n(0.028), h),
    "sidebar-ring": primary,
    "chart-1": "oklch(0.74 0.15 200)",
    "chart-2": ok(0.72, chartAccent, ah),
    "chart-3": "oklch(0.8 0.18 130)",
    "chart-4": "oklch(0.8 0.15 70)",
    "chart-5": "oklch(0.72 0.2 15)",
  };
}

export function resolvePalette(theme: CustomTheme, mode: ThemeMode): ThemePalette {
  const overrides = theme.overrides[mode];
  const palette = { ...generatePalette(theme, mode), ...overrides };
  for (const [target, source] of LINKS) {
    if (!overrides[target] && overrides[source]) palette[target] = palette[source];
  }
  return palette;
}

const fontStack = (font: ThemeFont | null, fallback: string) =>
  font ? `"${font.family}", var(${fallback})` : null;

export function buildThemeCss(theme: CustomTheme): string {
  const block = (selector: string, mode: ThemeMode, extra: string[]) => {
    const palette = resolvePalette(theme, mode);
    const lines = THEME_VARS.map((name) => `--${name}:${palette[name]}`);
    return `${selector}{${[...lines, ...extra].join(";")}}`;
  };
  const sans = fontStack(theme.sans, "--font-onest");
  const mono = fontStack(theme.mono, "--font-jetbrains-mono");
  const fonts = [sans && `--font-theme-sans:${sans}`, mono && `--font-theme-mono:${mono}`].filter(Boolean) as string[];
  const glow = (alpha: number) => `color-mix(in oklch,var(--primary) ${alpha}%,transparent)`;

  return [
    block("html.theme-custom", "light", [
      ...fonts,
      `--btn-primary-shadow:inset 0 1px 0 oklch(1 0 0/.22),0 1px 2px ${glow(40)},0 2px 6px -2px ${glow(50)}`,
    ]),
    block(".dark.theme-custom", "dark", [
      `--code-bg:${ok(0.14, theme.tint * 0.02, theme.hue)}`,
      `--btn-primary-shadow:inset 0 1px 0 oklch(1 0 0/.2),0 1px 2px oklch(0 0 0/.5),0 4px 12px -4px ${glow(55)}`,
    ]),
  ].join("\n");
}

export function googleFontsHref(list: (ThemeFont | null)[]): string | null {
  const fonts = list.filter((font): font is ThemeFont => !!font);
  if (!fonts.length) return null;
  const params = fonts.map((font) => {
    const family = encodeURIComponent(font.family).replace(/%20/g, "+");
    const weights = [...new Set(font.weights ?? [])].sort((a, b) => a - b);
    return `family=${family}${weights.length ? `:wght@${weights.join(";")}` : ""}`;
  });
  return `https://fonts.googleapis.com/css2?${[...new Set(params)].join("&")}&display=swap`;
}

const EXPORT_PREFIX = "kubek-theme:";

export function exportTheme(theme: CustomTheme): string {
  const bytes = new TextEncoder().encode(JSON.stringify(theme));
  return EXPORT_PREFIX + btoa(String.fromCharCode(...bytes));
}

/** Takes an exported string or plain JSON */
export function importTheme(input: string): CustomTheme | null {
  const text = input.trim();
  try {
    const json = text.startsWith(EXPORT_PREFIX)
      ? new TextDecoder().decode(Uint8Array.from(atob(text.slice(EXPORT_PREFIX.length)), (c) => c.charCodeAt(0)))
      : text;
    const parsed = customThemeSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** <input type="color"> only takes #rrggbb */
export function colorToHex(value: string): string | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
    return `#${digits.toLowerCase()}`;
  }
  const m = value.trim().match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/.*)?\)$/i);
  if (!m) return null;
  const l = Number(m[1]) / (m[2] ? 100 : 1);
  const c = Number(m[3]);
  const h = (Number(m[4]) * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return (
    "#" +
    linear
      .map((x) => {
        const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(x, 0) ** (1 / 2.4) - 0.055;
        return Math.round(Math.min(1, Math.max(0, v)) * 255)
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}
