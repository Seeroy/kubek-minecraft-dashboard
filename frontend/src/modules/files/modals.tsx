"use client";
import { ConfirmDialogModalRegistration } from "@/modules/files/modals/ConfirmDialogModal";
import { CreateArchiveModalRegistration } from "@/modules/files/modals/CreateArchiveModal";
import { NewDirectoryModalRegistration } from "@/modules/files/modals/NewDirectoryModal";
import { NewFileModalRegistration } from "@/modules/files/modals/NewFileModal";
import { FileEditorModalRegistration } from "@/modules/files/modals/EditorModal";

export function FilesModalsRegistration() {
  return (
    <>
      <NewDirectoryModalRegistration />
      <NewFileModalRegistration />
      <ConfirmDialogModalRegistration />
      <CreateArchiveModalRegistration />
      <FileEditorModalRegistration />
    </>
  );
}
