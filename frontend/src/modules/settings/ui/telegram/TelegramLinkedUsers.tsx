"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  useLinkedUsersQuery,
  useUnlinkUserMutation,
} from "@/modules/settings/api/telegram.queries";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Bot, Loader2, Trash2, User } from "lucide-react";

/** Lists Telegram accounts linked to panel users, with an unlink action */
export function TelegramLinkedUsers() {
  const { t } = useTranslation("modules.settings");
  const linkedUsersQuery = useLinkedUsersQuery(true);
  const linkedUsers = linkedUsersQuery.data ?? [];
  const linkedUsersLoading = linkedUsersQuery.isLoading;
  const unlinkMutation = useUnlinkUserMutation();

  return (
    <div className="space-y-4">
      <Label>{t("telegram.users.title")}</Label>
      {linkedUsersLoading ? (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("telegram.users.loading")}</span>
        </div>
      ) : linkedUsers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("telegram.users.table.avatar")}</TableHead>
              <TableHead>{t("telegram.users.table.username")}</TableHead>
              <TableHead>{t("telegram.users.table.telegramId")}</TableHead>
              <TableHead>{t("telegram.users.table.createdAt")}</TableHead>
              <TableHead>{t("telegram.users.table.createdBy")}</TableHead>
              <TableHead>{t("telegram.users.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linkedUsers.map((link) => (
              <TableRow key={link.telegramUser.id}>
                <TableCell>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </TableCell>
                <TableCell>
                  {link.telegramUser.username
                    ? `@${link.telegramUser.username}`
                    : `${link.telegramUser.firstName || ""} ${link.telegramUser.lastName || ""}`.trim() ||
                      "Unknown"}
                </TableCell>
                <TableCell>{link.telegramUser.id}</TableCell>
                <TableCell>
                  {new Date(link.telegramUser.linkedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{link.accountName}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unlinkMutation.mutate(link.telegramUser.id)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("telegram.users.table.remove")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="py-4 text-center text-muted-foreground">
          <Bot className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>{t("telegram.users.empty.title")}</p>
          <p className="text-sm">{t("telegram.users.empty.description")}</p>
        </div>
      )}
    </div>
  );
}
