"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useAssistantAvailable } from "../api/assistant.queries";
import { useAssistantLive } from "../hooks/useAssistantLive";
import { useAssistantPanel } from "../lib/panel-store";

const AssistantSheet = dynamic(() => import("./AssistantSheet"), { ssr: false });

// Soft tint by default, full gradient while the panel is open
const GRADIENT =
  "bg-linear-135/oklch from-primary/14 to-c-purple/20 text-primary ring-1 ring-primary/20 ring-inset hover:from-primary/22 hover:to-c-purple/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70 aria-pressed:from-primary aria-pressed:to-c-purple aria-pressed:text-primary-foreground aria-pressed:ring-0 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-smooth motion-safe:hover:[&_svg]:rotate-12";

/** Topbar entry, hidden until an admin turns the assistant on */
export function AssistantButton() {
  const { t } = useTranslation("modules.assistant");
  const available = useAssistantAvailable();
  const open = useAssistantPanel((s) => s.open);
  const setOpen = useAssistantPanel((s) => s.setOpen);
  // The sheet stays mounted after the first open so it can animate out
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);
  useAssistantLive(available);

  if (!available) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("title")}
        title={t("title")}
        aria-pressed={open}
        onClick={() => setOpen(!open)}
        className={GRADIENT}
      >
        <Sparkles />
      </Button>
      {mounted && <AssistantSheet />}
    </>
  );
}
