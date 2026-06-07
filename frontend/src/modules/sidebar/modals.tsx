"use client";
import { BulkDeleteServersDialogRegistration } from "./dialogs/BulkDeleteServersDialog";
import { DeleteServerDialogRegistration } from "./dialogs/DeleteServerDialog";
import { DuplicateServerDialogRegistration } from "./dialogs/DuplicateServerDialog";
import { ImportServerDialogRegistration } from "./dialogs/ImportServerDialog";
import { RenameServerDialogRegistration } from "./dialogs/RenameServerDialog";
import { FolderFormDialogRegistration } from "./ui/FolderFormDialog";
import { MoveToFolderDialogRegistration } from "./ui/MoveToFolderDialog";

export function SidebarModalsRegistration() {
  return (
    <>
      <RenameServerDialogRegistration />
      <DuplicateServerDialogRegistration />
      <DeleteServerDialogRegistration />
      <BulkDeleteServersDialogRegistration />
      <ImportServerDialogRegistration />
      <FolderFormDialogRegistration />
      <MoveToFolderDialogRegistration />
    </>
  );
}
