"use client";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { ApiError } from "@/shared/lib/http/types";
import { confirmDialog } from "@/shared/modals";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { SettingsGroup } from "@/shared/ui/settings";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { AccessArea } from "@shared/access/areas";
import type { BackupPolicy, BackupStorage } from "@shared/types/backup.types";
import { Cloud, HardDriveDownload, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useBackupStorages, useDefaultPolicy, useDeleteStorageMutation, useSaveDefaultPolicyMutation } from "../../api/backups.queries";
import { PolicyFields } from "../policy/PolicyFields";
import { OrphanArchives } from "./OrphanArchives";

const StorageDialog = lazy(() => import("./StorageDialog"));

/** Panel settings tab: remote storages and the default retention policy */
export function BackupStoragesSettings() {
  const { t } = useTranslation("modules.backups.storages");
  const storages = useBackupStorages();
  const canManage = useAuthStore((s) => s.can(AccessArea.STORAGES, "manage"));
  // The default policy is read under backups, saving it needs storages manage
  const canReadPolicy = useAuthStore((s) => s.can(AccessArea.BACKUPS, "read"));
  const [editing, setEditing] = useState<BackupStorage | "new" | null>(null);

  return (
    <>
      <SettingsGroup tone="blue" icon={Cloud} title={t("title")} description={t("description")} flush>
        {storages.isPending ? (
          <Skeleton className="m-5 h-24 rounded-md" />
        ) : storages.data?.length ? (
          <>
            <ul className="divide-y divide-border">
              {storages.data.map((storage) => (
                <StorageRow key={storage.id} storage={storage} onEdit={canManage ? () => setEditing(storage) : undefined} />
              ))}
            </ul>
            {canManage && (
              <div className="border-t border-border px-5 py-3">
                <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
                  <Plus />
                  {t("add")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HardDriveDownload />
              </EmptyMedia>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </EmptyHeader>
            {canManage && (
              <EmptyContent>
                <Button onClick={() => setEditing("new")}>
                  <Plus />
                  {t("add")}
                </Button>
              </EmptyContent>
            )}
          </Empty>
        )}
      </SettingsGroup>

      {canReadPolicy && <DefaultPolicy storages={storages.data ?? []} canSave={canManage} />}

      {canManage && <OrphanArchives />}

      {editing && (
        <Suspense>
          <StorageDialog storage={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />
        </Suspense>
      )}
    </>
  );
}

function StorageRow({ storage, onEdit }: { storage: BackupStorage; onEdit?: () => void }) {
  const { t } = useTranslation("modules.backups.storages");
  const { notify } = useNotifications();
  const remove = useDeleteStorageMutation();
  const { endpoint, bucket, prefix } = storage.config;

  const confirmRemove = async () => {
    const ok = await confirmDialog({
      title: t("deleteTitle", storage.name),
      description: t("deleteText"),
      confirmText: t("delete"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    remove.mutate(storage.id, {
      onError: (err) => {
        const inUse = err instanceof ApiError && err.code === "STORAGE_IN_USE";
        notify(inUse ? { type: "warning", title: t("inUse"), message: err.message } : { type: "error", title: getApiErrorMessage(err) });
      },
    });
  };

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">{storage.name}</div>
        <div className="truncate font-mono text-[12px] text-muted-foreground">
          {bucket}/{prefix} {endpoint && <span className="opacity-75">@ {endpoint.replace(/^https?:\/\//, "")}</span>}
        </div>
      </div>
      {onEdit && (
        <>
          <Button variant="ghost" size="icon-sm" aria-label={t("edit")} title={t("edit")} onClick={onEdit}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:bg-danger/10 hover:text-danger"
            aria-label={t("delete")}
            title={t("delete")}
            disabled={remove.isPending}
            onClick={() => void confirmRemove()}
          >
            <Trash2 />
          </Button>
        </>
      )}
    </li>
  );
}

function DefaultPolicy({ storages, canSave }: { storages: BackupStorage[]; canSave: boolean }) {
  const { t } = useTranslation("modules.backups");
  const { notify } = useNotifications();
  const saved = useDefaultPolicy();
  const save = useSaveDefaultPolicyMutation();
  const [draft, setDraft] = useState<BackupPolicy | null>(null);
  if (!saved.data) return <Skeleton className="h-64 rounded-lg" />;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved.data);

  return (
    <section aria-label={t("storages.defaults.title")}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <ShieldCheck className="size-4 text-muted-foreground" />
            {t("storages.defaults.title")}
          </h3>
          <p className="text-[13px] text-muted-foreground">{t("storages.defaults.description")}</p>
        </div>
        {canSave && (
          <Button
            disabled={!dirty || save.isPending}
            onClick={() =>
              draft &&
              save.mutate(draft, {
                onSuccess: () => {
                  setDraft(null);
                  notify({ type: "success", title: t("policy.saved") });
                },
              })
            }
          >
            {save.isPending && <Spinner />}
            {t("policy.save")}
          </Button>
        )}
      </div>
      <fieldset disabled={!canSave} className="contents">
        <PolicyFields value={draft ?? saved.data} onChange={setDraft} storages={storages} />
      </fieldset>
    </section>
  );
}
