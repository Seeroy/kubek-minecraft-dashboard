import type { Translator } from "@/locales/types";
import { emitToast } from "@/shared/lib/toast-bus";
import {
  useCreateScheduledTaskMutation,
  useUpdateScheduledTaskMutation,
} from "@/modules/scheduler/api/scheduler.queries";
import type { IScheduledTask } from "@shared/types/scheduler.types";
import React, { useEffect, useState } from "react";
import type { FormState } from "../types";
import { buildPayload } from "../utils/buildTaskPayload";
import { initialState, stateFromTask } from "../utils/taskFormState";

interface UseTaskFormInput {
  serverId: string;
  editingTask: IScheduledTask | null;
  open: boolean;
  onClose: (result: boolean) => void;
  t: Translator;
}

export function useTaskForm({
  serverId,
  editingTask,
  open,
  onClose,
  t,
}: UseTaskFormInput) {
  const [state, setState] = useState<FormState>(initialState());
  const [submitting, setSubmitting] = useState(false);

  const createMutation = useCreateScheduledTaskMutation(serverId);
  const updateMutation = useUpdateScheduledTaskMutation(serverId);

  useEffect(() => {
    if (!open) return;
    setState(editingTask ? stateFromTask(editingTask) : initialState());
  }, [open, editingTask]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const toggleWeekday = (day: number) => {
    set(
      "weekdays",
      state.weekdays.includes(day)
        ? state.weekdays.filter((d) => d !== day)
        : [...state.weekdays, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = buildPayload(state, serverId);
      if (editingTask) {
        const { serverId: _omit, ...rest } = payload;
        await updateMutation.mutateAsync({ id: editingTask.id, data: rest });
        emitToast({
          title: t("toasts.updated"),
          type: "success",
          duration: 3000,
        });
      } else {
        await createMutation.mutateAsync(payload);
        emitToast({
          title: t("toasts.created"),
          type: "success",
          duration: 3000,
        });
      }
      onClose(true);
    } catch (err: any) {
      emitToast({
        title: t("toasts.error"),
        message: err?.message,
        type: "error",
        duration: 6000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return { state, set, toggleWeekday, submitting, handleSubmit };
}
