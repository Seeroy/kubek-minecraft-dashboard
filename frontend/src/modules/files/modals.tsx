"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { lazy } from "react";

export const CREATE_DIRECTORY_MODAL_ID = "files/new-directory";
export const CREATE_FILE_MODAL_ID = "files/new-file";
export const CREATE_ARCHIVE_MODAL_ID = "files/create-archive";
export const FILE_EDITOR_MODAL_ID = "files/editor";

// One chunk for both, same layout
const NewDirectoryModal = lazy(() => import("./modals/NewEntryModal").then((m) => ({ default: m.NewDirectoryModal })));
const NewFileModal = lazy(() => import("./modals/NewEntryModal").then((m) => ({ default: m.NewFileModal })));
const CreateArchiveModal = lazy(() => import("./modals/CreateArchiveModal"));
const EditorModal = lazy(() => import("./modals/EditorModal"));

export function FilesModalsRegistration() {
  useThisModal({ id: CREATE_DIRECTORY_MODAL_ID, component: NewDirectoryModal, module: "file-manager" });
  useThisModal({ id: CREATE_FILE_MODAL_ID, component: NewFileModal, module: "file-manager" });
  useThisModal({ id: CREATE_ARCHIVE_MODAL_ID, component: CreateArchiveModal, module: "file-manager" });
  useThisModal({ id: FILE_EDITOR_MODAL_ID, component: EditorModal, module: "file-manager" });
  return null;
}
