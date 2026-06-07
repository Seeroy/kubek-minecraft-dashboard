"use client";
import { RunInfoModalRegistration } from "./modals/RunInfoModal";
import { TaskFormDialogRegistration } from "./ui/TaskFormDialog";

export function SchedulerModalsRegistration() {
  return (
    <>
      <TaskFormDialogRegistration />
      <RunInfoModalRegistration />
    </>
  );
}
