"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { Progress } from "@/shared/ui/progress";
import { Spinner } from "@/shared/ui/spinner";
import type { TaskStage } from "@shared/types/task.types";
import { Check, Circle, X } from "lucide-react";

const ICONS = {
  pending: <Circle className="size-3.5 text-muted-foreground/50" aria-hidden />,
  running: <Spinner className="size-3.5 text-primary" />,
  done: <Check className="size-3.5 text-success" aria-hidden />,
  failed: <X className="size-3.5 text-danger" aria-hidden />,
};

/** Stages of a long task as a checklist, the running one shows what it is doing */
export function TaskStageList({ stages, className }: { stages: TaskStage[]; className?: string }) {
  return (
    <ol className={cn("grid gap-1", className)}>
      {stages.map((stage) => (
        <StageRow key={stage.key} stage={stage} />
      ))}
    </ol>
  );
}

function StageRow({ stage }: { stage: TaskStage }) {
  const { t } = useTranslation("modules.components.taskStages");
  const label = t(`kinds.${stage.kind}`, stage.name ?? "");
  const running = stage.status === "running";
  const detail = running ? describe(stage, t) : stage.status === "pending" ? t("waiting") : stage.status === "failed" ? t("failed") : null;

  return (
    <li
      data-status={stage.status}
      className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 rounded-lg px-2.5 py-2 transition-colors duration-200 data-[status=running]:bg-primary/6"
    >
      <span className="grid place-items-center">{ICONS[stage.status]}</span>
      <span className={cn("truncate text-[13px]", stage.status === "pending" ? "text-muted-foreground" : "font-medium")}>
        {label.startsWith("NOT TRANSLATED") ? (stage.name ?? stage.kind) : label}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">{running && stage.progress ? `${stage.progress}%` : ""}</span>
      {detail && (
        <span className={cn("col-start-2 col-end-4 truncate text-xs", stage.status === "failed" ? "text-danger" : "text-muted-foreground")}>{detail}</span>
      )}
      {running && <Progress value={stage.progress ?? 0} aria-label={label} className="col-start-2 col-end-4" />}
    </li>
  );
}

function describe(stage: TaskStage, t: (key: string) => string): string | null {
  if (stage.bytes) {
    const { done, total } = stage.bytes;
    return total ? `${formatBytes(done)} / ${formatBytes(total)}` : formatBytes(done);
  }
  if (!stage.step) return null;
  const text = t(`steps.${stage.step}`);
  return text.startsWith("NOT TRANSLATED") ? null : text;
}
