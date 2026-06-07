"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  IScheduledTaskRun,
  ScheduledRunStatus,
} from "@shared/types/scheduler.types";
import React from "react";
import { formatDateTime, formatDuration } from "../utils/formatSchedule";

export interface RunInfoProps {
  run: IScheduledTaskRun;
  taskName?: string;
}

export const RUN_INFO_MODAL_ID = "scheduler/run-info";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "scheduler/run-info": { props: RunInfoProps; result: void };
  }
}

const RunInfoModal: React.FC<ModalProps<void> & RunInfoProps> = ({
  isOpen,
  onClose,
  run,
  taskName,
}) => {
  const { t } = useTranslation("modules.scheduler");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{taskName ?? run.taskId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-3 text-muted-foreground">
            <span>{formatDateTime(run.startedAt)}</span>
            <span>•</span>
            <span>{formatDuration(run.durationMs)}</span>
            <span>•</span>
            <span>{t(`runs.triggers.${run.triggeredBy}`)}</span>
            <Badge
              variant={
                run.status === ScheduledRunStatus.SUCCESS
                  ? "default"
                  : "destructive"
              }
            >
              {t(`runs.statuses.${run.status}`)}
            </Badge>
          </div>
          {run.output && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground uppercase">
                {t("runs.output")}
              </div>
              <pre className="rounded bg-muted/40 p-3 text-xs break-words whitespace-pre-wrap">
                {run.output}
              </pre>
            </div>
          )}
          {run.error && (
            <div>
              <div className="mb-1 text-xs font-medium text-destructive uppercase">
                {t("runs.error")}
              </div>
              <pre className="rounded bg-destructive/10 p-3 text-xs break-words whitespace-pre-wrap">
                {run.error}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function RunInfoModalRegistration() {
  useThisModal({
    id: RUN_INFO_MODAL_ID,
    component: RunInfoModal,
    module: "scheduler",
  });
  return null;
}

export default RunInfoModal;
