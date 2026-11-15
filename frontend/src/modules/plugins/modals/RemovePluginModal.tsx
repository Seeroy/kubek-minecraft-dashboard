"use client";

import { api, type ContentKind } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { qk } from "@/shared/queries/query-keys";
import { useRemoveContentMutation } from "@/shared/queries";
import type { ModalProps } from "@/shared/types/modal.types";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import type { InstalledPluginView } from "@shared/types/plugins";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { getContentKind } from "../content-kind";
import { displayName, fileNameOf, primaryCategory } from "../lib/installed";
import { ProjectIcon } from "../ui/ProjectIcon";

export interface RemovePluginProps {
  kind: ContentKind;
  serverId: string;
  item: InstalledPluginView;
  installed: InstalledPluginView[];
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "plugins/remove": { props: RemovePluginProps; result: void };
  }
}

type RemovePluginModalProps = ModalProps & RemovePluginProps;

function RemovePluginModalComponent({ isOpen, onClose, kind, serverId, item, installed }: RemovePluginModalProps) {
  const config = getContentKind(kind);
  const { t } = useTranslation(config.i18nNs);
  const { t: tc } = useTranslation("modules.content.remove");
  const { notify } = useNotifications();
  const queryClient = useQueryClient();
  const [withDependants, setWithDependants] = useState(true);

  // Manual jars and Kubek Companion are plain files, not Modrinth records
  const manual = item.type !== "modrinth";
  const name = displayName(item);
  const file = fileNameOf(item);
  const dependants = installed.filter((other) => other.dependencyOf === item.id);

  const removeRecord = useRemoveContentMutation(kind, serverId);
  // Manual jars are not tracked records, deleting the file is the whole removal
  const removeFile = useMutation({
    mutationFn: () => api.files.deleteFile(serverId, { path: `${config.installFolder}/${item.fileName}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: (kind === "mod" ? qk.mods : qk.plugins).installed(serverId) }),
  });
  const pending = removeRecord.isPending || removeFile.isPending;

  const remove = async () => {
    // Modrinth records report through the task notification, a plain file has no task
    if (!manual) {
      removeRecord.mutate({ recordId: item.id, payload: { removeDependants: withDependants } });
      onClose();
      return;
    }
    await removeFile.mutateAsync();
    notify({ type: "success", title: t("remove.removed", file) });
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !pending && onClose()}>
      {/* minmax(0) so a long file name truncates instead of widening the dialog */}
      <AlertDialogContent className="grid-cols-[minmax(0,1fr)]">
        <AlertDialogHeader>
          <AlertDialogMedia className="tone-red">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("remove.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("remove.description", name)}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-3 rounded-md border border-border bg-subtle p-3">
          <ProjectIcon title={name} iconUrl={item.metadata?.iconUrl} category={primaryCategory(item.metadata?.categories)} />
          <div className="min-w-0 flex-1">
            <b className="block truncate font-semibold">{name}</b>
            <span className="block truncate font-mono text-xs text-muted-foreground" title={file}>{tc("version", item.version?.versionNumber ?? "—", file)}</span>
          </div>
        </div>

        {!manual && dependants.length > 0 && (
          <label className="flex cursor-pointer items-start gap-2.5">
            <Switch checked={withDependants} onCheckedChange={setWithDependants} disabled={pending} className="mt-0.5" />
            <span>
              <span className="block font-medium">{t("remove.dependants")}</span>
              <span className="block text-[12.5px] text-muted-foreground">{t("remove.dependantsDescription", dependants.map(displayName).join(", "))}</span>
            </span>
          </label>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={() => void remove()} disabled={pending}>
            {pending ? <Spinner /> : <Trash2 />}
            {pending ? tc("removing") : t("remove.title")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const REMOVE_PLUGIN_MODAL_ID = "plugins/remove";

export function RemovePluginModalRegistration() {
  useThisModal({
    id: REMOVE_PLUGIN_MODAL_ID,
    component: RemovePluginModalComponent,
    module: "plugins",
  });

  return null;
}
