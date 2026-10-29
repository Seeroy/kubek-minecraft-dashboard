"use client";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useAccess } from "@/shared/lib/access";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { AccessArea } from "@shared/access/areas";
import type { BackupPolicy } from "@shared/types/backup.types";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useBackupPolicy, useBackupStorages, usePolicyPreview, useSavePolicyMutation } from "../../api/backups.queries";
import { PolicyFields } from "./PolicyFields";

export function ServerPolicyPanel({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.backups.policy");
  const { notify } = useNotifications();
  const policy = useBackupPolicy(serverId);
  const storages = useBackupStorages().data ?? [];
  const save = useSavePolicyMutation(serverId);
  const [draft, setDraft] = useState<BackupPolicy | null>(null);
  const canSave = useAccess([AccessArea.BACKUPS, "manage"], serverId);
  const preview = usePolicyPreview(serverId, useDebouncedValue(draft, 400));

  if (!policy.data) return <Skeleton className="h-96 rounded-lg" />;
  const { custom, local, remote } = policy.data;
  const saved: BackupPolicy = { local, remote };
  const value = draft ?? saved;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);
  const doomed = dirty ? preview.data : undefined;

  const submit = (next: BackupPolicy | null) =>
    save.mutate(next, {
      onSuccess: () => {
        setDraft(null);
        notify({ type: "success", title: t("saved") });
      },
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={custom ? "info" : "secondary"}>{custom ? t("custom") : t("usingDefaults")}</Badge>
        {canSave && (
          <div className="ml-auto flex gap-2">
            {custom && (
              <Button variant="outline" disabled={save.isPending} onClick={() => submit(null)}>
                <RotateCcw />
                {t("resetToDefaults")}
              </Button>
            )}
            <Button disabled={!dirty || save.isPending} onClick={() => draft && submit(draft)}>
              {save.isPending && <Spinner />}
              {t("save")}
            </Button>
          </div>
        )}
      </div>
      {doomed && doomed.local + doomed.remote > 0 && (
        <Alert variant="destructive" className="mb-4">
          <TriangleAlert />
          <AlertDescription>{t("willDelete", doomed.local, doomed.remote)}</AlertDescription>
        </Alert>
      )}
      <fieldset disabled={!canSave} className="contents">
        <PolicyFields value={value} onChange={setDraft} storages={storages} />
      </fieldset>
    </div>
  );
}
