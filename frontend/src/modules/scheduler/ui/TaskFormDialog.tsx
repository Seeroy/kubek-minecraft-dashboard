"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Separator } from "@/shared/ui/separator";
import { CalendarPlus } from "lucide-react";
import { useCronPreview } from "../hooks/useCronPreview";
import { useTaskForm } from "../hooks/useTaskForm";
import type { TaskFormProps } from "../types";
import { ActionTypeFields } from "./ActionTypeFields";
import { GeneralFields } from "./GeneralFields";
import { ScheduleModeTabs } from "./ScheduleModeTabs";

export type { TaskFormProps };

export const TASK_FORM_MODAL_ID = "scheduler/task-form";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "scheduler/task-form": { props: TaskFormProps; result: boolean };
  }
}

type TaskFormDialogProps = ModalProps<boolean> & TaskFormProps;

export const TaskFormDialog = ({
  serverId,
  isOpen,
  onClose,
  editingTask = null,
}: TaskFormDialogProps) => {
  const open = isOpen;
  const { t } = useTranslation("modules.scheduler");

  const { state, set, toggleWeekday, submitting, handleSubmit } = useTaskForm({
    serverId,
    editingTask,
    open,
    onClose,
    t,
  });

  const { cronPreview, cronPreviewError } = useCronPreview({
    mode: state.mode,
    cronExpression: state.cronExpression,
    timezone: state.timezone,
    t,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-10">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle>
                {editingTask
                  ? t("form.submitUpdate")
                  : t("page.header.createButton")}
              </DialogTitle>
              <DialogDescription>
                {t("form.dialogDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <GeneralFields state={state} set={set} t={t} />

          <Separator />

          <ScheduleModeTabs
            state={state}
            set={set}
            toggleWeekday={toggleWeekday}
            cronPreview={cronPreview}
            cronPreviewError={cronPreviewError}
            t={t}
          />

          <Separator />

          <ActionTypeFields state={state} set={set} t={t} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(false)}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !state.name.trim()}>
              {editingTask ? t("form.submitUpdate") : t("form.submitCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export function TaskFormDialogRegistration() {
  useThisModal({
    id: TASK_FORM_MODAL_ID,
    component: TaskFormDialog,
    module: "scheduler",
  });
  return null;
}
