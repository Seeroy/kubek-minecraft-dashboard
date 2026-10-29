"use client";

import type { Account } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { PlayerHead } from "@/shared/ui/player-head";
import { SettingsGroup } from "@/shared/ui/settings";
import { Skeleton } from "@/shared/ui/skeleton";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AccessArea } from "@shared/access/areas";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useAccounts, useDeleteAccountMutation } from "../api/accounts.queries";
import { useRoles } from "../api/roles.queries";
import { useRoleLabels } from "../data/access-areas";
import { USER_FORM_MODAL_ID } from "../modals";

const VISIBLE_SERVERS = 2;
const VISIBLE_ROLES = 2;

export const isAdmin = (account: Account) => account.isAdmin;

export default function UserManagement() {
  const { t } = useTranslation("modules.settings.users");
  const { notify } = useNotifications();
  const { openModal } = useModal();
  const { servers } = useServerStore();
  const accounts = useAccounts();
  const roles = useRoles();
  const canWrite = useAuthStore((s) => s.can(AccessArea.ACCOUNTS, "write"));
  const roleLabels = useRoleLabels();
  const remove = useDeleteAccountMutation();
  const [query, setQuery] = useState("");

  const serverName = useMemo(() => new Map(servers.map((server) => [server.id, server.name])), [servers]);
  const roleName = useMemo(() => new Map((roles.data ?? []).map((role) => [role.id, roleLabels.name(role)])), [roles.data, roleLabels]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (accounts.data ?? []).filter((account) => !q || account.username.toLowerCase().includes(q));
  }, [accounts.data, query]);

  const confirmRemove = async (account: Account) => {
    const ok = await confirmDialog({
      title: t("confirmDelete.title", account.username),
      description: t("confirmDelete.description"),
      confirmText: t("confirmDelete.confirm"),
      cancelText: t("confirmDelete.cancel"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    await remove.mutateAsync(account.username);
    notify({ type: "success", title: t("toasts.deleted") });
  };

  return (
    <SettingsGroup tone="blue" icon={Users} title={t("title")} description={t("description")} flush>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <InputGroup className="w-full sm:w-60">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} />
        </InputGroup>
        {canWrite && (
          <Button className="ml-auto" onClick={() => openModal(USER_FORM_MODAL_ID, {})}>
            <Plus />
            {t("add")}
          </Button>
        )}
      </div>

      {accounts.isLoading ? (
        <div className="grid gap-2 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("user")}</TableHead>
              <TableHead className="hidden w-64 @2xl/table:table-cell">{t("servers")}</TableHead>
              <TableHead className="hidden w-56 @xl/table:table-cell">{t("roles")}</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((account) => {
              const admin = isAdmin(account);
              const restrict = account.serversRestrict;
              return (
                <TableRow key={account.id} className="h-14">
                  <TableCell>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <PlayerHead name={account.skinName || account.username} size={30} className="size-[30px] rounded-[7px]" />
                      <b className="truncate font-semibold">{account.username}</b>
                      {admin && <Badge variant="warning">{t("admin")}</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="hidden @2xl/table:table-cell">
                    {!restrict?.enabled ? (
                      <Badge variant="success">{t("allServers")}</Badge>
                    ) : restrict.allowed.length === 0 ? (
                      <span className="text-muted-foreground">{t("noServers")}</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {restrict.allowed.slice(0, VISIBLE_SERVERS).map((id) => (
                          <Badge key={id} variant="secondary" className="max-w-32 truncate">
                            {serverName.get(id) ?? id}
                          </Badge>
                        ))}
                        {restrict.allowed.length > VISIBLE_SERVERS && (
                          <Badge variant="secondary">{t("more", restrict.allowed.length - VISIBLE_SERVERS)}</Badge>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden @xl/table:table-cell">
                    {account.roles.length === 0 ? (
                      <span className="text-muted-foreground">{Object.keys(account.grants ?? {}).length ? t("personal") : t("noRoles")}</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {account.roles.slice(0, VISIBLE_ROLES).map((id) => (
                          <Badge key={id} variant="info" className="max-w-36 truncate">
                            {roleName.get(id) ?? id}
                          </Badge>
                        ))}
                        {account.roles.length > VISIBLE_ROLES && <Badge variant="secondary">{t("more", account.roles.length - VISIBLE_ROLES)}</Badge>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      {canWrite && (
                        <Button variant="ghost" size="sm" onClick={() => openModal(USER_FORM_MODAL_ID, { account })}>
                          <Pencil />
                          {t("edit")}
                        </Button>
                      )}
                      {canWrite && !admin && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:bg-danger/10 hover:text-danger"
                          title={t("delete")}
                          aria-label={t("delete")}
                          onClick={() => void confirmRemove(account)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </SettingsGroup>
  );
}
