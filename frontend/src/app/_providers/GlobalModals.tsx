'use client';
import { CreateBackupModalRegistration } from '@/modules/backups/modals/CreateBackupModal';
import { FilesModalsRegistration } from '@/modules/files/modals';
import { SchedulerModalsRegistration } from '@/modules/scheduler/modals';
import { NewServerModalRegistration } from '@/modules/server';
import { UserFormModalRegistration } from '@/modules/settings';
import { SidebarModalsRegistration } from '@/modules/sidebar/modals';
import { SharedModalsRegistration } from '@/shared/modals';

export function GlobalModalsRegistration() {
  return (
    <>
      <SharedModalsRegistration/>
      <SidebarModalsRegistration/>
      <SchedulerModalsRegistration/>
      <FilesModalsRegistration/>
      <NewServerModalRegistration/>
      <UserFormModalRegistration/>
      <CreateBackupModalRegistration/>
    </>
  );
}
