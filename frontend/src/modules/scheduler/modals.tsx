"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { lazy } from "react";

export const TASK_FORM_MODAL_ID = "scheduler/task-form";
export const RUN_INFO_MODAL_ID = "scheduler/run-info";

const TaskFormDialog = lazy(() => import("./modals/TaskFormDialog"));
const RunInfoModal = lazy(() => import("./modals/RunInfoModal"));

export function SchedulerModalsRegistration() {
  useThisModal({ id: TASK_FORM_MODAL_ID, component: TaskFormDialog, module: "scheduler" });
  useThisModal({ id: RUN_INFO_MODAL_ID, component: RunInfoModal, module: "scheduler" });
  return null;
}
