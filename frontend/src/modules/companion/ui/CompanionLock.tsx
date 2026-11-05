"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import type { ReactNode } from "react";
import type { CompanionState } from "../hooks/useCompanion";

/** Why a companion feature can't be used right now */
export function useCompanionHint(state: CompanionState): string {
  const { t } = useTranslation("modules.companion.lock");
  if (state === "waiting") return t("waiting");
  if (state === "offline") return t("offline");
  return t("missing");
}

interface CompanionLockProps {
  state: CompanionState;
  /** Unlocked children render as is */
  locked: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Hint over a control that needs the plugin. Disabled buttons swallow pointer
 * events, so the tooltip hangs on a wrapper and the caller disables the control
 */
export function CompanionLock({ state, locked, children, className }: CompanionLockProps) {
  const hint = useCompanionHint(state);
  if (!locked) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn("inline-flex cursor-not-allowed", className)} />}>{children}</TooltipTrigger>
      <TooltipContent className="max-w-64 leading-snug">{hint}</TooltipContent>
    </Tooltip>
  );
}
