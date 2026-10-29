"use client";

import { useColorTheme } from "@/shared/hooks/useColorTheme";
import type { ColorTheme } from "@/shared/lib/color-theme";
import { cn } from "@/shared/lib/cn";
import { Check } from "lucide-react";

// Background, primary and accent of each theme, enough to recognise it at a glance
export const COLOR_THEMES: { id: ColorTheme; name: string; swatch: [string, string, string] }[] = [
  { id: "default", name: "Kubek", swatch: ["oklch(0.16 0.005 260)", "oklch(0.68 0.185 265)", "oklch(0.24 0.008 260)"] },
  { id: "green", name: "Green", swatch: ["oklch(0.97 0.01 155)", "oklch(0.6 0.16 155)", "oklch(0.93 0.04 155)"] },
  { id: "mono", name: "Mono", swatch: ["oklch(0.145 0 0)", "oklch(0.95 0 0)", "oklch(0.27 0 0)"] },
  { id: "nether", name: "Nether", swatch: ["oklch(0.155 0.014 35)", "oklch(0.72 0.15 48)", "oklch(0.29 0.05 48)"] },
  { id: "cherry", name: "Cherry", swatch: ["oklch(0.982 0.007 350)", "oklch(0.62 0.13 355)", "oklch(0.935 0.035 355)"] },
];

export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useColorTheme();

  return (
    <div role="radiogroup" className={cn("grid grid-cols-2 gap-3 sm:grid-cols-5", className)}>
      {COLOR_THEMES.map(({ id, name, swatch }) => {
        const selected = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(id)}
            className="grid cursor-pointer gap-2 rounded-lg border border-border p-2 text-left transition-[border-color,translate,box-shadow] duration-150 outline-none hover:-translate-y-px hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-primary/18 aria-checked:border-primary aria-checked:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
          >
            <span className="grid h-[54px] grid-cols-[2fr_1fr_1fr] overflow-hidden rounded-md" style={{ background: swatch[0] }}>
              <span />
              <span style={{ background: swatch[1] }} />
              <span style={{ background: swatch[2] }} />
            </span>
            <span className="flex items-center justify-between text-[13px] font-semibold">
              {name}
              {selected && <Check className="size-3.5 text-primary" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
