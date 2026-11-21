import { buildThemeCss, type CustomTheme, customThemeSchema, DEFAULT_CUSTOM_THEME, googleFontsHref } from "./custom-theme";

export const COLOR_THEMES = ["default", "green", "mono", "nether", "cherry", "custom"] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number];

const STORAGE_KEY = "colorTheme";
const CLASS_PREFIX = "theme-";
const CUSTOM_KEY = "customTheme";
// Ready css and font url, so the boot script skips the generator
const CUSTOM_BOOT_KEY = "customThemeBoot";
const STYLE_ID = "custom-theme";
const FONTS_ID = "custom-theme-fonts";

const isColorTheme = (value: unknown): value is ColorTheme =>
  COLOR_THEMES.includes(value as ColorTheme);

export function readColorTheme(): ColorTheme {
  const active = [...document.documentElement.classList]
    .find((name) => name.startsWith(CLASS_PREFIX))
    ?.slice(CLASS_PREFIX.length);
  return isColorTheme(active) ? active : "default";
}

export function applyColorTheme(theme: ColorTheme) {
  const root = document.documentElement;
  for (const name of COLOR_THEMES) root.classList.remove(CLASS_PREFIX + name);
  if (theme !== "default") root.classList.add(CLASS_PREFIX + theme);
  // Google Fonts are only worth loading while the custom theme is on
  if (theme === "custom") saveCustomTheme(readCustomTheme());
  else document.getElementById(FONTS_ID)?.remove();
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked, the class still applies for this session
  }
}

export function readCustomTheme(): CustomTheme {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    const parsed = raw ? customThemeSchema.safeParse(JSON.parse(raw)) : null;
    if (parsed?.success) return parsed.data;
  } catch {
    // Broken or blocked storage, start from the default
  }
  return DEFAULT_CUSTOM_THEME;
}

export function saveCustomTheme(theme: CustomTheme) {
  const css = buildThemeCss(theme);
  const href = googleFontsHref([theme.sans, theme.mono]);
  injectCustomTheme(css, document.documentElement.classList.contains(CLASS_PREFIX + "custom") ? href : null);
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(theme));
    localStorage.setItem(CUSTOM_BOOT_KEY, JSON.stringify({ css, href }));
  } catch {
    // Applies for this session anyway
  }
}

function injectCustomTheme(css: string, href: string | null) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;

  let link = document.getElementById(FONTS_ID) as HTMLLinkElement | null;
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = FONTS_ID;
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) link.href = href;
}

// Runs in <head> before first paint so a saved theme never flashes the default one
export const colorThemeBootScript = `try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(${JSON.stringify(COLOR_THEMES.filter((t) => t !== "default"))}.indexOf(t)>-1)document.documentElement.classList.add(${JSON.stringify(CLASS_PREFIX)}+t);if(t==="custom"){var b=JSON.parse(localStorage.getItem(${JSON.stringify(CUSTOM_BOOT_KEY)})||"{}"),d=document.head;if(b.css){var s=document.createElement("style");s.id=${JSON.stringify(STYLE_ID)};s.textContent=b.css;d.appendChild(s)}if(b.href){var l=document.createElement("link");l.rel="stylesheet";l.id=${JSON.stringify(FONTS_ID)};l.href=b.href;d.appendChild(l)}}}catch(e){}`;
