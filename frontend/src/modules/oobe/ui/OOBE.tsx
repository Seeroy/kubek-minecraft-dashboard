"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Button } from "@/shared/ui/button";
import { Kbd } from "@/shared/ui/kbd";
import { AccessArea } from "@shared/access/areas";
import { ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useEffectEvent, useState } from "react";
import { STEPS, type OOBEStep } from "../lib/steps";
import { useLatestCreation } from "../lib/useLatestCreation";
import { CompletionStep } from "./steps/CompletionStep";
import { EULAStep } from "./steps/EULAStep";
import { PreferencesStep } from "./steps/PreferencesStep";
import { ServerCreationStep } from "./steps/ServerCreationStep";
import { StepRail } from "./StepRail";

function ThemeToggle() {
  const { t } = useTranslation("modules.oobe.navigation");
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed top-4 right-4 z-10"
      aria-label={t("toggleTheme")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

export default function OOBE() {
  const { t } = useTranslation("modules.oobe");
  const canCreate = useAuthStore((state) => state.can(AccessArea.SERVERS, "write"));
  const steps = canCreate ? STEPS : STEPS.filter((step) => step.id !== "serverCreation");
  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const creation = useLatestCreation();

  const step = steps[index];
  const last = steps.length - 1;
  const canNext = step.id !== "eula" || accepted;
  const skip = step.id === "serverCreation" && (!creation || creation.failed);

  const go = (delta: number) => {
    setBack(delta < 0);
    setIndex((current) => Math.max(0, Math.min(last, current + delta)));
  };

  const onEnter = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Enter" || !canNext || step.id === "completion") return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, button, [role=dialog]")) return;
    go(1);
  });

  useEffect(() => {
    window.addEventListener("keydown", onEnter);
    return () => window.removeEventListener("keydown", onEnter);
  }, []);

  const body: Record<Exclude<OOBEStep, "completion">, ReactNode> = {
    eula: <EULAStep accepted={accepted} onAcceptedChange={setAccepted} />,
    preferences: <PreferencesStep />,
    serverCreation: <ServerCreationStep creation={creation} />,
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-6">
      <ThemeToggle />
      {step.id === "completion" ? (
        <CompletionStep serverName={creation?.done ? creation.serverName : undefined} />
      ) : (
        <section className="grid w-full max-w-[980px] overflow-hidden rounded-xl border border-border bg-card shadow-card-lg md:min-h-[600px] md:grid-cols-[260px_minmax(0,1fr)]">
          <StepRail steps={steps} current={index} />
          <div className="flex min-w-0 flex-col">
            <header className="border-b border-border px-4 pt-5 pb-4 md:px-6">
              <div className="flex items-baseline justify-between gap-3">
                <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{t(`steps.${step.id}.title`)}</h1>
                <span className="text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                  {t("navigation.stepOf", index + 1, steps.length)}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{t(`steps.${step.id}.description`)}</p>
              <div
                role="progressbar"
                aria-valuenow={index + 1}
                aria-valuemax={steps.length}
                className="mt-3 h-1 overflow-hidden rounded-full bg-secondary"
              >
                <i
                  className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-smooth"
                  style={{ width: `${((index + 1) / steps.length) * 100}%` }}
                />
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden px-4 py-5 md:px-6">
              <div
                key={step.id}
                className={cn(
                  "animate-in duration-400 ease-smooth fade-in",
                  back ? "slide-in-from-left-6" : "slide-in-from-right-6"
                )}
              >
                {body[step.id]}
              </div>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-4 md:px-6">
              <Button variant="outline" disabled={index === 0} onClick={() => go(-1)}>
                <ChevronLeft />
                {t("navigation.back")}
              </Button>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {canNext ? (
                  <>
                    <Kbd>Enter</Kbd> {t("navigation.enterHint")}
                  </>
                ) : (
                  t("navigation.acceptHint")
                )}
              </span>
              <Button variant={skip ? "outline" : "default"} disabled={!canNext} onClick={() => go(1)}>
                {t(skip ? "navigation.skip" : index === last - 1 ? "navigation.finish" : "navigation.next")}
                <ChevronRight />
              </Button>
            </footer>
          </div>
        </section>
      )}
    </main>
  );
}
