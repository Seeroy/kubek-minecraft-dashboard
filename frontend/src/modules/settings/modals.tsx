"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { lazy } from "react";

export const USER_FORM_MODAL_ID = "settings/user-form";
export const ROLE_FORM_MODAL_ID = "settings/role-form";
export const API_KEY_FORM_MODAL_ID = "settings/api-key-form";

const UserFormModal = lazy(() => import("./modals/UserFormModal"));
const RoleFormModal = lazy(() => import("./modals/RoleFormModal"));
const ApiKeyFormModal = lazy(() => import("./modals/ApiKeyFormModal"));

export function UserFormModalRegistration() {
  useThisModal({ id: USER_FORM_MODAL_ID, component: UserFormModal, module: "global" });
  useThisModal({ id: ROLE_FORM_MODAL_ID, component: RoleFormModal, module: "global" });
  useThisModal({ id: API_KEY_FORM_MODAL_ID, component: ApiKeyFormModal, module: "global" });
  return null;
}
