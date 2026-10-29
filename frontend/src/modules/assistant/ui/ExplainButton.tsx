"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Sparkles } from "lucide-react";
import type { ComponentProps } from "react";
import { useAssistantAvailable } from "../api/assistant.queries";
import { openAssistantWith } from "../lib/panel-store";

interface ExplainButtonProps extends Omit<ComponentProps<typeof Button>, "onClick" | "children"> {
  /** Ready prompt for a new chat, the user can edit it before sending */
  prompt: string;
  /** Icon only, for dense rows like console lines */
  compact?: boolean;
}

export function ExplainButton({ prompt, compact, ...props }: ExplainButtonProps) {
  const { t } = useTranslation("modules.assistant");
  const available = useAssistantAvailable();
  if (!available) return null;

  if (compact) {
    return (
      <Button variant="ghost" size="icon-xs" aria-label={t("explain")} title={t("explain")} onClick={() => openAssistantWith(prompt)} {...props}>
        <Sparkles />
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => openAssistantWith(prompt)} {...props}>
      <Sparkles />
      {t("explain")}
    </Button>
  );
}
