"use client";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { confirmDialog } from "@/shared/modals";
import { Button } from "@/shared/ui/button";
import { SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { FileWarning, Trash2 } from "lucide-react";
import { useDeleteOrphansMutation, useOrphanArchives } from "../../api/backups.queries";

/** Archives on the panel disk that no backup points to, hidden while there are none */
export function OrphanArchives() {
  const { t } = useTranslation("modules.backups.storages.orphans");
  const { notify } = useNotifications();
  const orphans = useOrphanArchives();
  const remove = useDeleteOrphansMutation();
  const items = orphans.data ?? [];
  if (items.length === 0) return null;
  const total = items.reduce((sum, a) => sum + a.size, 0);

  const confirmRemove = async () => {
    const ok = await confirmDialog({
      title: t("deleteTitle", items.length),
      description: t("deleteText", formatBytes(total)),
      confirmText: t("delete"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    remove.mutate(
      items.map((a) => a.key),
      { onSuccess: ({ removed }) => notify({ type: "success", title: t("deleted", removed) }) }
    );
  };

  return (
    <SettingsGroup tone="amber" icon={FileWarning} title={t("title")} description={t("description", items.length, formatBytes(total))} flush>
      <ul className="max-h-64 divide-y divide-border overflow-y-auto">
        {items.map((archive) => (
          <li key={archive.key} className="flex items-center gap-3 px-5 py-2.5">
            <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]" title={archive.key}>
              {archive.key}
            </span>
            <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">{formatBytes(archive.size)}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-border px-5 py-3">
        <Button variant="outline" size="sm" className="hover:bg-danger/10 hover:text-danger" disabled={remove.isPending} onClick={() => void confirmRemove()}>
          {remove.isPending ? <Spinner /> : <Trash2 />}
          {t("delete")}
        </Button>
      </div>
    </SettingsGroup>
  );
}
