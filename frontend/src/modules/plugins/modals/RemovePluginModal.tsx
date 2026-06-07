"use client";

import { contentApi, type ContentKind } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useThisModal } from "@/shared/hooks/useThisModal";
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
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { InstalledPluginView } from "@shared/types/plugins";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { getContentKind } from "../content-kind";

interface RemovePluginModalProps extends ModalProps {
  kind?: ContentKind;
  serverId?: string;
  plugin?: InstalledPluginView;
  onComplete?: () => void;
}

function RemovePluginModalComponent({
  isOpen,
  onClose,
  kind = "plugin",
  serverId,
  plugin,
  onComplete,
}: RemovePluginModalProps) {
  const [removeDependants, setRemoveDependants] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notify } = useNotifications();
  const config = getContentKind(kind);
  const { t } = useTranslation(`${config.i18nNs}.modals.remove`);
  const pluginTitle = plugin?.metadata?.title ?? t("summary.unknownPlugin");
  const pluginVersion =
    plugin?.version?.versionNumber ?? t("summary.unknownVersion");

  const handleRemove = async () => {
    if (!serverId || !plugin) {
      notify({ title: t("notifications.missingDetails"), type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await contentApi(kind).remove(serverId, plugin.id, {
        removeDependants,
      });
      onComplete?.();
      onClose();
    } catch (error: any) {
      notify({
        title: error?.message || t("notifications.removeFailed"),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>
                {plugin
                  ? t("description.withName", pluginTitle)
                  : t("description.fallback")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {plugin ? (
          <div className="space-y-4 py-4 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-foreground">
              <p className="font-medium">{pluginTitle}</p>
              <p className="text-xs text-muted-foreground">
                {t("summary.version", pluginVersion)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 p-3">
              <div className="space-y-1">
                <Label htmlFor="dependants" className="text-sm">
                  {t("options.removeDependants")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("options.removeDependantsDescription")}
                </p>
              </div>
              <Switch
                id="dependants"
                checked={removeDependants}
                onCheckedChange={setRemoveDependants}
                disabled={isSubmitting}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/50 p-4 text-center text-sm text-muted-foreground">
            {t("summary.emptyState")}
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t("buttons.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={!plugin || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("buttons.removing")}
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("buttons.remove")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
