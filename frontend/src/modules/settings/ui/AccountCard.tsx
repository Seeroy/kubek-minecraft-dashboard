"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { IUser, UserPermissions } from "@shared/types/user.types";
import { Pencil, Server, Shield, Trash2, User } from "lucide-react";
import { useAvailablePermissions } from "../data/permissions";

interface AccountCardProps {
  user: IUser;
  onEdit: (user: IUser) => void;
  onDelete: (userId: string) => void;
}

export default function AccountCard({
  user,
  onEdit,
  onDelete,
}: AccountCardProps) {
  const availablePermissions = useAvailablePermissions();
  const { t } = useTranslation("modules.settings");

  const getPermissionData = (permission: UserPermissions) => {
    return availablePermissions.find((p) => p.id === permission);
  };

  const getInitials = (username: string): string => {
    return username
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  return (
    <div className="rounded-xl border border-border/60 p-3 transition-colors duration-150 hover:bg-muted/40 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        {/* User Info */}
        <div className="flex min-w-0 flex-1 items-start gap-3 md:gap-4">
          <Avatar
            className={`h-10 w-10 flex-shrink-0 md:h-12 md:w-12 ${user.isAdmin ? "ring-2 ring-red-200" : "ring-2 ring-blue-200"}`}
          >
            <AvatarImage src={""} />
            <AvatarFallback
              className={
                user.isAdmin
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/15 text-primary"
              }
            >
              {getInitials(user.username)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Header with basic info */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h3 className="text-base font-semibold break-all md:text-lg">
                  {user.username}
                </h3>
                {user.isAdmin && (
                  <Badge variant="destructive" className="gap-1">
                    <Shield className="h-3 w-3" />
                    {t("accountCard.admin")}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {/* Server Access */}
              <div className="flex items-start gap-2 text-sm">
                <Server className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="font-medium">
                    {t("accountCard.serverAccess")}
                  </span>
                  {user.serversRestrict.enabled ? (
                    user.serversRestrict.allowed.length > 0 ? (
                      <div className="ml-1 inline-flex flex-wrap gap-1">
                        {user.serversRestrict.allowed.map(
                          (server: string, index: number) => (
                            <Badge
                              key={index}
                              variant={"outline"}
                              className="rounded-md"
                            >
                              {server}
                            </Badge>
                          )
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("accountCard.noServers")}
                      </span>
                    )
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {t("accountCard.allServers")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span>{t("accountCard.permissions")}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {user.permissions.map((permission) => {
                    const permissionData = getPermissionData(permission);
                    const IconComponent = permissionData?.icon || User;
                    return (
                      <Badge
                        key={permission}
                        variant="secondary"
                        className={`flex items-center gap-1 rounded-md border-none px-1.5 py-1 text-xs ${permissionData?.color || "bg-gray-500/10 text-gray-700"}`}
                      >
                        <IconComponent className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {permissionData?.label || permission}
                        </span>
                      </Badge>
                    );
                  })}
                  {user.permissions.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t("accountCard.noPermissions")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 flex-row gap-2 border-t border-border/60 pt-3 md:ml-4 md:border-t-0 md:border-l-0 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(user)}
            className="flex-1 gap-2 md:flex-none"
          >
            <Pencil className="h-3 w-3" />
            <span>{t("accountCard.edit")}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(user.id)}
            className="flex-1 gap-2 text-destructive hover:text-destructive md:flex-none"
            disabled={user.isAdmin}
          >
            <Trash2 className="h-3 w-3" />
            <span>{t("accountCard.delete")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
