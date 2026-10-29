"use client";
import { NETWORK_WIZARD_MODAL_ID } from "@/modules/networks/modal-ids";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { lazy } from "react";

export const RENAME_SERVER_MODAL_ID = "sidebar/rename-server";
export const DUPLICATE_SERVER_MODAL_ID = "sidebar/duplicate-server";
export const DELETE_SERVER_MODAL_ID = "sidebar/delete-server";
export const BULK_DELETE_SERVERS_MODAL_ID = "sidebar/bulk-delete-servers";
export const IMPORT_SERVER_MODAL_ID = "sidebar/import-server";
export const FOLDER_FORM_MODAL_ID = "sidebar/folder-form";
export const MOVE_TO_FOLDER_MODAL_ID = "sidebar/move-to-folder";

const RenameServerDialog = lazy(() => import("./dialogs/RenameServerDialog"));
const DuplicateServerDialog = lazy(() => import("./dialogs/DuplicateServerDialog"));
const DeleteServerDialog = lazy(() => import("./dialogs/DeleteServerDialog"));
const BulkDeleteServersDialog = lazy(() => import("./dialogs/BulkDeleteServersDialog"));
const ImportServerDialog = lazy(() => import("./dialogs/ImportServerDialog"));
const FolderFormDialog = lazy(() => import("./ui/FolderFormDialog"));
const MoveToFolderDialog = lazy(() => import("./ui/MoveToFolderDialog"));
const NetworkWizardDialog = lazy(() => import("@/modules/networks/ui/wizard/NetworkWizardDialog"));

export function SidebarModalsRegistration() {
  useThisModal({ id: RENAME_SERVER_MODAL_ID, component: RenameServerDialog, module: "sidebar" });
  useThisModal({ id: DUPLICATE_SERVER_MODAL_ID, component: DuplicateServerDialog, module: "sidebar" });
  useThisModal({ id: DELETE_SERVER_MODAL_ID, component: DeleteServerDialog, module: "sidebar" });
  useThisModal({ id: BULK_DELETE_SERVERS_MODAL_ID, component: BulkDeleteServersDialog, module: "sidebar" });
  useThisModal({ id: IMPORT_SERVER_MODAL_ID, component: ImportServerDialog, module: "sidebar" });
  useThisModal({ id: FOLDER_FORM_MODAL_ID, component: FolderFormDialog, module: "sidebar" });
  useThisModal({ id: MOVE_TO_FOLDER_MODAL_ID, component: MoveToFolderDialog, module: "sidebar" });
  useThisModal({ id: NETWORK_WIZARD_MODAL_ID, component: NetworkWizardDialog, module: "sidebar" });
  return null;
}
