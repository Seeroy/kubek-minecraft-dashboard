"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Plate } from "@/shared/ui/plate";
import { ScheduledRunStatus, type IScheduledTask, type IScheduledTaskRun } from "@shared/types/scheduler.types";
import { AlertTriangle, Check, Clock, History, Loader2 } from "lucide-react";
import { actionLook, shortDateTime } from "../lib/look";
import { formatRunDuration } from "../lib/schedule";

export interface RunInfoProps {
  run: IScheduledTaskRun;
  task?: IScheduledTask;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "scheduler/run-info": { props: RunInfoProps; result: void };
  }
}

const statusLook = {
  [ScheduledRunStatus.SUCCESS]: { icon: Check, tone: "green" },
  [ScheduledRunStatus.FAILED]: { icon: AlertTriangle, tone: "red" },
  [ScheduledRunStatus.RUNNING]: { icon: Loader2, tone: "blue" },
} as const;

export default function RunInfoModal({ isOpen, onClose, run, task }: ModalProps<void> & RunInfoProps) {
  const { t } = useTranslation("modules.scheduler");
  const look = task ? actionLook[task.action] : { icon: History, tone: "gray" as const };
  const status = statusLook[run.status];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone={look.tone}>
            <look.icon />
          </Plate>
          <div className="min-w-0">
            <DialogTitle className="truncate">{task?.name ?? t("runs.deletedTask")}</DialogTitle>
            <DialogDescription>{task ? t(`actions.${task.action}`) : run.taskId}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-md border border-border bg-subtle p-3">
              <Plate tone={status.tone} size="sm">
                <status.icon className={run.status === ScheduledRunStatus.RUNNING ? "animate-spin" : undefined} />
              </Plate>
              <div>
                <div className="label-caps">{t("runInfo.status")}</div>
                <div className="flex items-center gap-2 text-[13.5px] font-semibold">
                  {t(`status.${run.status}`)}
                  <Badge variant="secondary">{t(`trigger.${run.triggeredBy}`)}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border bg-subtle p-3">
              <Plate tone="cyan" size="sm">
                <Clock />
              </Plate>
              <div>
                <div className="label-caps">{t("runInfo.time")}</div>
                <div className="text-[13.5px] font-semibold tabular-nums">
                  {shortDateTime(run.startedAt)} · {formatRunDuration(run.durationMs, t)}
                </div>
              </div>
            </div>
          </div>

          {run.output && (
            <section className="grid gap-2">
              <div className="label-caps">{t("runInfo.output")}</div>
              <pre className="max-h-64 scrollbar-thin overflow-auto rounded-md bg-code p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-code-foreground">
                {run.output}
              </pre>
            </section>
          )}
          {run.error && (
            <section className="grid gap-2">
              <div className="label-caps text-danger">{t("runInfo.error")}</div>
              <pre className="max-h-64 scrollbar-thin overflow-auto rounded-md bg-danger/8 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-danger">
                {run.error}
              </pre>
            </section>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
