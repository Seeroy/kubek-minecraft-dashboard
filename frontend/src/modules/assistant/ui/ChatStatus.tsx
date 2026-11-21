"use client";
import { languageOptions } from "@/locales";
import { useLanguageContext } from "@/shared/context/language-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import type {
  AssistantPlan,
  IAssistantMessage,
} from "@shared/types/assistant.types";
import { ChevronUp, ListChecks } from "lucide-react";
import { useAssistantStatus } from "../api/assistant.queries";
import { PlanSteps, planProgress } from "./PlanCard";

const RING = 2 * Math.PI * 6;
// Below half full the meter is just noise
const SHOW_FROM = 0.5;

/** How full the model context is, the last request carried the whole conversation */
export function ContextMeter({ messages }: { messages: IAssistantMessage[] }) {
  const { t } = useTranslation("modules.assistant.context");
  const { language } = useLanguageContext();
  const limit = useAssistantStatus().data?.capabilities.contextWindow ?? null;
  const last = messages.findLast((message) => message.usage)?.usage;
  if (!limit || !last) return null;

  const used = last.promptTokens + last.completionTokens;
  const share = Math.min(1, used / limit);
  if (share < SHOW_FROM) return null;
  const percent = Math.round(share * 100);
  const compact = new Intl.NumberFormat(languageOptions[language].locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const details = t("details", compact.format(used), compact.format(limit));
  const level =
    share >= 0.9
      ? "text-danger"
      : share >= 0.75
        ? "text-warn"
        : "text-muted-foreground";

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1", level)}
      title={share >= 0.75 ? `${details}\n${t("full")}` : details}
    >
      <svg viewBox="0 0 16 16" className="size-3.5 -rotate-90" aria-hidden>
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth="2.5"
        />
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING * (1 - share)}
          className="transition-[stroke-dashoffset] duration-500 ease-smooth"
        />
      </svg>
      <span>
        <span className="sr-only">{t("label")} </span>
        {percent}%
      </span>
    </span>
  );
}

/** The approved plan stays in sight above the composer while it runs */
export function PlanProgress({ plan }: { plan: AssistantPlan }) {
  const { t } = useTranslation("modules.assistant.plan");
  const { done, total } = planProgress(plan);
  const current =
    plan.steps.find((step) => step.status === "in_progress") ??
    plan.steps.find((step) => step.status === "pending");

  return (
    <Collapsible className="mx-4 mb-2 animate-pop-in overflow-hidden rounded-lg border border-border bg-card text-xs">
      <CollapsibleTrigger className="group/progress flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left transition-colors outline-none hover:bg-hover focus-visible:bg-hover">
        <ListChecks className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span className="shrink-0 font-medium tabular-nums">
          {t("title")} {t("progress", done, total)}
        </span>
        {current && (
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-muted-foreground",
              current.status === "in_progress" && "text-shimmer"
            )}
          >
            {current.text}
          </span>
        )}
        <ChevronUp
          className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-aria-expanded/progress:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="scrollbar-thin max-h-56 overflow-y-auto border-t border-border px-1 py-1">
        <PlanSteps steps={plan.steps} />
      </CollapsibleContent>
    </Collapsible>
  );
}
