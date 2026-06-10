"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { AlertTriangle, Check, Loader } from "lucide-react";
import type { CreationStage } from "./stages";

interface CreationProgressStageListProps {
  stages: CreationStage[];
  message?: string | null;
}

// Stage list with a per-card progress bar
export function CreationProgressStageList({
  stages,
  message,
}: CreationProgressStageListProps) {
  const { t } = useTranslation("modules.newServerModal.modal.progress");

  return (
    <ol className="flex flex-col gap-2">
      {stages.map((stage, idx) => {
        const pct = Math.round(stage.progress * 100);
        const isDone = stage.state === "done";
        const isActive = stage.state === "active";
        const isError = stage.state === "error";

        return (
          <li
            key={stage.key}
            className={cn(
              "relative overflow-hidden rounded-xl border transition-colors",
              isError
                ? "border-destructive/40 bg-card/40"
                : isDone
                  ? "border-border/60 bg-card/40"
                  : isActive
                    ? "border-primary/40 bg-card/40"
                    : "border-border/40 bg-card/20"
            )}
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 transition-all duration-500 ease-out",
                isError
                  ? "bg-destructive/15"
                  : isDone
                    ? "bg-emerald-500/15"
                    : isActive
                      ? "bg-primary/10"
                      : "bg-transparent"
              )}
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            <div className="relative flex flex-col gap-1 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    isError
                      ? "border-destructive/40 bg-destructive/20 text-destructive"
                      : isDone
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-500"
                        : isActive
                          ? "border-primary/40 bg-background/60 text-primary"
                          : "border-border/60 bg-background/40 text-muted-foreground/50"
                  )}
                >
                  {isDone ? (
                    <Check size={12} strokeWidth={3} />
                  ) : isError ? (
                    <AlertTriangle size={12} />
                  ) : isActive ? (
                    <Loader size={12} className="animate-spin" />
                  ) : (
                    <span className="text-[10px] font-semibold">{idx + 1}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "flex-1 text-sm",
                    isDone
                      ? "text-foreground/70"
                      : isActive
                        ? "text-foreground"
                        : isError
                          ? "text-destructive"
                          : "text-muted-foreground/50"
                  )}
                >
                  {t(`stages.${stage.key}`)}
                </span>
                <span
                  className={cn(
                    "w-10 text-right text-xs font-medium tabular-nums",
                    isActive ? "text-foreground/75" : "text-muted-foreground/50"
                  )}
                >
                  {pct}%
                </span>
              </div>
              {isActive && message && (
                <span className="block truncate pl-9 font-mono text-xs text-muted-foreground">
                  {message}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
