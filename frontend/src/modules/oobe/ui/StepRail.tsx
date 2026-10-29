"use client";

import { useKubekVersionQuery } from "@/modules/settings/api/about.queries";
import { formatVersion } from "@/modules/settings/ui/about/version";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import LogoV2 from "@/shared/ui/logo-v2";
import { Plate } from "@/shared/ui/plate";
import { Check } from "lucide-react";
import type { STEPS } from "../lib/steps";

interface StepRailProps {
  steps: typeof STEPS;
  current: number;
}

export function StepRail({ steps, current }: StepRailProps) {
  const { t } = useTranslation("modules.oobe");
  const version = useKubekVersionQuery();

  return (
    <aside className="flex items-center gap-4 overflow-x-auto border-b border-border bg-subtle px-4 py-3 md:flex-col md:items-stretch md:gap-6 md:border-r md:border-b-0 md:p-5">
      <LogoV2 size="sm" className="shrink-0 max-md:[&>span]:hidden" />
      <ol className="flex gap-2 md:grid md:gap-0.5">
        {steps.map(({ id, icon: Icon, tone }, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          return (
            <li
              key={id}
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md p-2",
                // Connector to the previous step
                "md:not-first:before:absolute md:not-first:before:-top-[9px] md:not-first:before:left-[22px] md:not-first:before:h-4 md:not-first:before:w-0.5 md:not-first:before:rounded-full md:not-first:before:bg-border",
                i <= current && "md:not-first:before:bg-success/55",
                state === "current" && "bg-raised shadow-sm"
              )}
            >
              <Plate tone={state === "done" ? "green" : state === "upcoming" ? "gray" : tone} className="transition-colors duration-250">
                {state === "done" ? <Check /> : <Icon />}
              </Plate>
              <span className="min-w-0 whitespace-nowrap">
                <b className={cn("block text-[13px] leading-snug font-semibold", state === "upcoming" && "font-medium text-muted-foreground")}>
                  {t(`steps.${id}.rail`)}
                </b>
                <span className="hidden text-xs text-muted-foreground md:block">
                  {state === "upcoming" && id === "serverCreation" ? t("rail.optional") : t(`rail.${state}`)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-auto hidden gap-2 text-xs text-muted-foreground md:grid">
        {version.data && <span>{t("rail.version", formatVersion(version.data))}</span>}
        <span>{t("rail.hint")}</span>
      </div>
    </aside>
  );
}
