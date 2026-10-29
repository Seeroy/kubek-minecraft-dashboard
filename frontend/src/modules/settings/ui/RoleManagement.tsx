"use client";

import type { Role } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { SettingsGroup } from "@/shared/ui/settings";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AccessArea } from "@shared/access/areas";
import { Copy, Eye, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useDeleteRoleMutation, useDuplicateRoleMutation, useRoles } from "../api/roles.queries";
import { grantedAreas, toAccessMap, useRoleLabels } from "../data/access-areas";
import { useAccessErrorMessage } from "../lib/access-errors";
import { ROLE_FORM_MODAL_ID } from "../modals";
import { roleWithin, useAccessLimit } from "./access/useAccessContext";

const BUILTIN_ORDER = ["viewer", "moderator", "operator", "server-admin"];

const builtinRank = (role: Role) => {
  const index = BUILTIN_ORDER.indexOf(role.builtinKey ?? "");
  return role.builtin ? (index === -1 ? BUILTIN_ORDER.length : index) : BUILTIN_ORDER.length + 1;
};

export default function RoleManagement() {
  const { t } = useTranslation("modules.settings.roles");
  const { notify } = useNotifications();
  const { openModal } = useModal();
  const roles = useRoles();
  const labels = useRoleLabels();
  const limit = useAccessLimit();
  const errorMessage = useAccessErrorMessage();
  const canManage = useAuthStore((s) => s.can(AccessArea.ACCOUNTS, "manage"));
  const remove = useDeleteRoleMutation();
  const duplicate = useDuplicateRoleMutation();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (roles.data ?? [])
      .map((role) => ({ role, name: labels.name(role) }))
      .filter(({ name }) => !q || name.toLowerCase().includes(q))
      .sort((a, b) => builtinRank(a.role) - builtinRank(b.role) || a.name.localeCompare(b.name));
  }, [roles.data, query, labels]);

  const fail = (err: unknown) => notify({ type: "error", title: errorMessage(err) });

  const confirmRemove = async (role: Role, name: string) => {
    const ok = await confirmDialog({
      title: t("confirmDelete.title", name),
      description: t("confirmDelete.description", role.members),
      confirmText: t("confirmDelete.confirm"),
      cancelText: t("confirmDelete.cancel"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    remove.mutate(role.id, { onSuccess: () => notify({ type: "success", title: t("toasts.deleted") }), onError: fail });
  };

  const copy = (role: Role) =>
    duplicate.mutate(role.id, { onSuccess: (created) => notify({ type: "success", title: t("toasts.duplicated", created.name) }), onError: fail });

  return (
    <SettingsGroup tone="purple" icon={ShieldCheck} title={t("title")} description={t("description")} flush>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <InputGroup className="w-full sm:w-60">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} />
        </InputGroup>
        {canManage && (
          <Button className="ml-auto" onClick={() => openModal(ROLE_FORM_MODAL_ID, {})}>
            <Plus />
            {t("add")}
          </Button>
        )}
      </div>

      {roles.isLoading ? (
        <div className="grid gap-2 p-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheck />
            </EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("role")}</TableHead>
              <TableHead className="hidden w-32 @xl/table:table-cell">{t("access")}</TableHead>
              <TableHead className="hidden w-32 @lg/table:table-cell">{t("members")}</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ role, name }) => {
              const description = labels.description(role);
              const areas = grantedAreas(toAccessMap(role.grants)).length;
              // Roles above your own access can be looked at but not changed
              const editable = canManage && roleWithin(role, limit);
              return (
                <TableRow key={role.id} className="h-14">
                  <TableCell className="whitespace-normal">
                    <span className="grid min-w-0 gap-0.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <b className="truncate font-semibold">{name}</b>
                        {role.builtin && <Badge variant="secondary">{t("builtinBadge")}</Badge>}
                      </span>
                      {description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
                    </span>
                  </TableCell>
                  <TableCell className="hidden @xl/table:table-cell">
                    {areas > 0 || role.ext.length > 0 ? (
                      <Badge variant="info">{t("areasCount", areas)}</Badge>
                    ) : (
                      <span className="text-muted-foreground">{t("noAccess")}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums @lg/table:table-cell">{t("membersCount", role.members)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      <Button variant="ghost" size="sm" onClick={() => openModal(ROLE_FORM_MODAL_ID, { role, readOnly: !editable })}>
                        {editable ? <Pencil /> : <Eye />}
                        {editable ? t("edit") : t("view")}
                      </Button>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={t("duplicate")}
                          aria-label={t("duplicate")}
                          disabled={duplicate.isPending || !roleWithin(role, limit)}
                          onClick={() => copy(role)}
                        >
                          <Copy />
                        </Button>
                      )}
                      {editable && !role.builtin && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:bg-danger/10 hover:text-danger"
                          title={t("delete")}
                          aria-label={t("delete")}
                          onClick={() => void confirmRemove(role, name)}
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
