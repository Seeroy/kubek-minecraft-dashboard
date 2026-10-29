"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Plate } from "@/shared/ui/plate";
import { ArrowUpRight, Bug, Gauge, Puzzle, ScrollText, Sparkles, type LucideIcon } from "lucide-react";
import { openAssistantWith } from "../lib/panel-store";

const SUGGESTIONS: { key: string; icon: LucideIcon }[] = [
  { key: "crash", icon: Bug },
  { key: "errors", icon: ScrollText },
  { key: "content", icon: Puzzle },
  { key: "performance", icon: Gauge },
];

/** Empty chat, a suggestion only fills the composer so the user still sends it */
export function Welcome() {
  const { t } = useTranslation("modules.assistant.chat");
  return (
    <div className="my-auto grid gap-6 py-6">
      <div className="grid justify-items-center gap-3 text-center">
        <Plate size="xl">
          <Sparkles />
        </Plate>
        <div className="grid gap-1">
          <h3 className="text-[15px] font-semibold">{t("welcomeTitle")}</h3>
          <p className="mx-auto max-w-[34ch] text-[13px] leading-relaxed text-muted-foreground">{t("welcomeDescription")}</p>
        </div>
      </div>
      <ul className="grid gap-1.5" aria-label={t("suggestionsLabel")}>
        {SUGGESTIONS.map(({ key, icon: Icon }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => openAssistantWith(t(`suggestions.${key}`))}
              className="group/suggest flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-[13px] transition-colors duration-150 ease-smooth hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover/suggest:text-primary" aria-hidden />
              <span className="min-w-0 flex-1">{t(`suggestions.${key}`)}</span>
              <ArrowUpRight
                className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-150 ease-smooth group-hover/suggest:translate-x-0.5 group-hover/suggest:-translate-y-px group-hover/suggest:opacity-100"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
