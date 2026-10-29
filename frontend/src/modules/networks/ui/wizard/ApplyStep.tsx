"use client";
import type { NetworkChangeResult } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Plate } from "@/shared/ui/plate";
import { Progress } from "@/shared/ui/progress";
import { TaskStageList } from "@/shared/ui/task-stages";
import { TaskStatus } from "@shared/types/task.types";
import { Check, Network, TriangleAlert } from "lucide-react";
import { useWatchedTask } from "@/shared/hooks/useWatchedTask";
import { RestartPrompt } from "../RestartPrompt";

export function ApplyStep({ taskId }: { taskId: string }) {
  const { t } = useTranslation("modules.networks.apply");
  const task = useWatchedTask(taskId).data;
  const status = task?.status ?? TaskStatus.PENDING;
  const result = task?.result as NetworkChangeResult | undefined;

  if (status === TaskStatus.FAILED || status === TaskStatus.CANCELLED) {
    return (
      <div className="grid gap-4">
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>
            {t("failed")}
            {task?.error?.message ? `: ${task.error.message}` : ""}
          </AlertDescription>
        </Alert>
        {!!task?.stages?.length && <TaskStageList stages={task.stages} />}
      </div>
    );
  }

  const done = status === TaskStatus.SUCCESS;

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3" data-state={done ? "done" : "running"}>
        <Plate tone={done ? "green" : "cyan"} size="lg">
          {done ? <Check /> : <Network className="animate-pulse motion-reduce:animate-none" />}
        </Plate>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <b className="text-[13.5px] font-semibold">{done ? t("done") : t("running")}</b>
            {!done && <span className="text-xs text-muted-foreground tabular-nums">{task?.progress ?? 0}%</span>}
          </div>
          {!done && <Progress value={task?.progress ?? 0} />}
        </div>
      </div>
      {!!task?.stages?.length && <TaskStageList stages={task.stages} />}
      {done && result && <RestartPrompt serverIds={result.restart} />}
    </div>
  );
}
