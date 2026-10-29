"use client";
import { CreateBackupModalRegistration } from "@/modules/backups/modals/CreateBackupModal";
import { FilesModalsRegistration } from "@/modules/files/modals";
import { SchedulerModalsRegistration } from "@/modules/scheduler/modals";
import { NewServerModalRegistration } from "@/modules/server/modals/CreateServerModal";
import { UserFormModalRegistration } from "@/modules/settings/modals";
import { SidebarModalsRegistration } from "@/modules/sidebar/modals";

export function GlobalModalsRegistration() {
  return (
    <>
      <SidebarModalsRegistration />
      <SchedulerModalsRegistration />
      <FilesModalsRegistration />
      <NewServerModalRegistration />
      <UserFormModalRegistration />
      <CreateBackupModalRegistration />
    </>
  );
}
