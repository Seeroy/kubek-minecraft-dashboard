"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Form } from "@/shared/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IUser, UserPermissions } from "@shared/types/user.types";
import { Pencil, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { BasicInfoSection } from "./BasicInfoSection";
import { PermissionsSection } from "./PermissionsSection";
import {
  UserEditFormData,
  UserFormData,
  userEditSchema,
  userSchema,
} from "./schema";
import { ServerAccessSection } from "./ServerAccessSection";

type CreateModeProps = {
  mode: "create";
  onUserCreate?: (userData: Omit<IUser, "id" | "secret">) => void;
};

type EditModeProps = {
  mode: "edit";
  user?: IUser;
  onUserUpdate?: (
    userId: string,
    userData: Partial<Omit<IUser, "id" | "secret">>
  ) => void;
};

export type UserFormModalProps = ModalProps & (CreateModeProps | EditModeProps);

export function UserFormModal(props: UserFormModalProps) {
  const { isOpen, onClose, mode } = props;
  const isEdit = mode === "edit";
  const editUser = isEdit ? props.user : undefined;

  const [isLoading, setIsLoading] = useState(false);

  const { t: tCreate } = useTranslation("modules.createUserModal");
  const { t: tEdit } = useTranslation("modules.editUserModal");
  const t = isEdit ? tEdit : tCreate;

  const form = useForm<UserFormData | UserEditFormData>({
    resolver: zodResolver(isEdit ? userEditSchema : userSchema) as any,
    defaultValues: {
      username: "",
      password: "",
      serversRestrict: { enabled: false, allowed: [] },
      permissions: [UserPermissions.SERVERS_VIEW],
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && editUser) {
      form.reset({
        username: editUser.username,
        password: "",
        serversRestrict: editUser.serversRestrict,
        permissions: editUser.permissions,
      });
    } else if (!isEdit) {
      form.reset();
    }
    setIsLoading(false);
  }, [isOpen, isEdit, editUser, form]);

  const onSubmit = async (data: UserFormData | UserEditFormData) => {
    setIsLoading(true);
    try {
      if (isEdit) {
        if (!editUser) return;
        const userData = {
          username: data.username.trim(),
          password: data.password || undefined,
          serversRestrict: data.serversRestrict,
          permissions: data.permissions,
        };
        props.onUserUpdate?.(editUser.id, userData);
      } else {
        const userData = {
          username: data.username.trim(),
          password: (data as UserFormData).password,
          serversRestrict: data.serversRestrict,
          permissions: data.permissions,
          isAdmin: data.permissions.includes(UserPermissions.KUBEK_SETTINGS),
        };
        props.onUserCreate?.(userData);
      }
      onClose();
    } catch (error) {
      console.error(
        isEdit ? "Failed to update user:" : "Failed to create user:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isEdit && !editUser) return null;

  const isFormValid = form.formState.isValid;
  const selectedPermissions = form.watch("permissions");
  const Icon = isEdit ? Pencil : UserPlus;
  const submitGroup = isEdit ? "update" : "create";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:grid-rows-[auto_1fr_auto] max-sm:gap-0 max-sm:rounded-none max-sm:border-0 max-sm:p-0 sm:max-h-[90vh] sm:max-w-2xl sm:overflow-y-auto">
        <DialogHeader className="pr-10 max-sm:border-b max-sm:border-border/60 max-sm:p-4 max-sm:pr-14">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle>{t("modal.title")}</DialogTitle>
              <DialogDescription>{t("modal.description")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 max-sm:flex max-sm:min-h-0 max-sm:flex-col max-sm:space-y-0 max-sm:overflow-hidden"
          >
            <div className="space-y-6 max-sm:flex-1 max-sm:space-y-6 max-sm:overflow-y-auto max-sm:p-4">
              <BasicInfoSection
                form={form}
                isLoading={isLoading}
                isEdit={isEdit}
              />
              <ServerAccessSection form={form} isLoading={isLoading} />
              <PermissionsSection
                form={form}
                selectedPermissions={selectedPermissions}
              />
            </div>

            <DialogFooter className="flex gap-2 pt-4 max-sm:border-t max-sm:border-border/60 max-sm:p-4 max-sm:pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="max-sm:w-full"
              >
                {t("modal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="gap-2 max-sm:w-full"
              >
                <Icon className="h-4 w-4" />
                {isLoading
                  ? t(`modal.buttons.${submitGroup}.loading`)
                  : t(`modal.buttons.${submitGroup}.default`)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
