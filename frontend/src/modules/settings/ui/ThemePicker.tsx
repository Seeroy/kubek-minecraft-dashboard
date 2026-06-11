"use client";

import { useColorTheme } from "@/shared/context/theme-context";
import { cn } from "@/shared/lib/cn";

const themes = [
  {
    id: "default" as const,
    name: "Default",
    primary: "oklch(0.6100 0.1900 265)",
  },
  {
    id: "cosmic-night" as const,
    name: "Cosmic night",
    primary: "oklch(0.5800 0.2000 290)",
  },
  {
    id: "amethyst" as const,
    name: "Amethyst",
    primary: "oklch(0.6200 0.1600 305)",
  },
  {
    id: "green" as const,
    name: "Green",
    primary: "oklch(0.6000 0.1600 155)",
  },
  {
    id: "aurora" as const,
    name: "Aurora",
    primary: "oklch(0.5800 0.1500 162)",
    gradient: true,
  },
];

function ThemePreview({
  primary,
  isSelected,
  gradient,
}: {
  primary: string;
  isSelected: boolean;
  gradient?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid h-11 w-16 cursor-pointer grid-cols-[12px_1fr_20px] grid-rows-[1fr_1fr_6px] gap-1 rounded-md border-2 border-background p-1.5 transition-all",
        "bg-muted",
        isSelected
          ? "outline-2 outline-offset-2 outline-primary"
          : "border-transparent hover:border-border"
      )}
    >
      <div
        className="col-start-1 row-span-2 row-start-1 rounded-[3px]"
        style={{
          backgroundColor: `color-mix(in oklch, ${primary} 40%, #000)`,
        }}
      />
      <div
        className="col-span-2 col-start-2 row-span-2 row-start-1 rounded-[3px]"
        style={{
          backgroundColor: `color-mix(in oklch, ${primary} 20%, #666)`,
        }}
      />
      <div
        className="col-start-2 row-start-3 rounded-[3px]"
        style={{
          backgroundColor: `color-mix(in oklch, ${primary} 15%, #777)`,
        }}
      />
      <div
        className="col-start-3 row-start-3 rounded-[3px]"
        style={
          gradient
            ? {
                backgroundImage: `linear-gradient(180deg, color-mix(in oklch, ${primary} 75%, white), ${primary}, color-mix(in oklch, ${primary} 80%, black))`,
              }
            : { backgroundColor: primary }
        }
      />
    </div>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useColorTheme();

  return (
    <div className="flex flex-wrap items-center gap-3 p-2">
      {themes.map((themeItem) => (
        <div
          key={themeItem.id}
          onClick={() => setTheme(themeItem.id)}
          className="flex flex-col items-center gap-2"
          title={themeItem.name}
        >
          <ThemePreview
            primary={themeItem.primary}
            isSelected={theme === themeItem.id}
            gradient={"gradient" in themeItem && themeItem.gradient}
          />
        </div>
      ))}
    </div>
  );
}
