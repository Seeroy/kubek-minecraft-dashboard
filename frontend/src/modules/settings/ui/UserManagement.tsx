"use client";

import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { IUser } from "@shared/types/user.types";
import { UserPlus, Users } from "lucide-react";
import {
  CREATE_USER_MODAL_ID,
  EDIT_USER_MODAL_ID,
} from "../modals/UserFormModal";
import AccountCard from "./AccountCard";

interface UserManagementProps {
  users: IUser[];
  onUserCreate: (userData: Omit<IUser, "id">) => void;
  onUserUpdate: (userId: string, userData: Partial<Omit<IUser, "id">>) => void;
  onUserDelete: (userId: string) => void;
}

export default function UserManagement({
  users,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
}: UserManagementProps) {
  const { openModal } = useModal();
  const { t } = useTranslation("modules.settings");

  const handleCreateUser = () => {
    openModal(CREATE_USER_MODAL_ID, {
      onUserCreate: (userData: any) => onUserCreate(userData),
    });
  };

  const handleEditUser = (user: IUser) => {
    openModal(EDIT_USER_MODAL_ID, {
      user,
      onUserUpdate: (userId: string, userData: Omit<IUser, "id">) =>
        onUserUpdate(userId, userData),
    });
  };

  return (
    <div className="space-y-6">
      {/* Users List Card */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("users.title")}
            title={t("users.title")}
            description={t("users.description")}
            icon={Users}
            color="primary"
            actions={
              <Button
                onClick={handleCreateUser}
                className="hidden gap-2 md:inline-flex"
              >
                <UserPlus className="h-4 w-4" />
                {t("users.add")}
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <div className="flex flex-col gap-3">
            {users.length > 0 && (
              <Button
                onClick={handleCreateUser}
                variant="outline"
                className="w-full gap-2 border-dashed md:hidden"
              >
                <UserPlus className="h-4 w-4" />
                {t("users.add")}
              </Button>
            )}
            {users.length > 0 ? (
              users.map((user) => (
                <AccountCard
                  key={user.id}
                  user={user}
                  onEdit={handleEditUser}
                  onDelete={onUserDelete}
                />
              ))
            ) : (
              <div className="py-12 text-center">
                <UserPlus className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" />
                <p className="mb-2 text-muted-foreground">
                  {t("users.empty.title")}
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  {t("users.empty.description")}
                </p>
                <Button onClick={handleCreateUser} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t("users.empty.create")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
