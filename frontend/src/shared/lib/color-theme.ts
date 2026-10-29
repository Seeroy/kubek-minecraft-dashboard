export const COLOR_THEMES = ["default", "green", "mono", "nether", "cherry"] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number];

const STORAGE_KEY = "colorTheme";
const CLASS_PREFIX = "theme-";

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
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked, the class still applies for this session
  }
}

// Runs in <head> before first paint so a saved theme never flashes the default one
export const colorThemeBootScript = `try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(${JSON.stringify(COLOR_THEMES.filter((t) => t !== "default"))}.indexOf(t)>-1)document.documentElement.classList.add(${JSON.stringify(CLASS_PREFIX)}+t)}catch(e){}`;
