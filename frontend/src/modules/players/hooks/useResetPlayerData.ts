"use client";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { RotateCcw } from "lucide-react";
import { useResetPlayerDataMutation } from "../api/players.queries";
import { usePlayersError } from "./usePlayersError";

export function useResetPlayerData(serverId: string) {
  const { t } = useTranslation("modules.players.details");
  const { notify } = useNotifications();
  const errorText = usePlayersError();
  const mutation = useResetPlayerDataMutation(serverId);

  const reset = async (uuid: string, label: string) => {
    const ok = await confirmDialog({
      title: t("reset.confirm", label),
      description: t("reset.confirmText"),
      confirmText: t("reset.action"),
      cancelText: t("cancel"),
      icon: RotateCcw,
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await mutation.mutateAsync(uuid);
      notify({ type: "success", title: t("reset.done", label) });
    } catch (error) {
      notify({ type: "error", title: errorText(error) });
    }
  };

  return { reset, pending: mutation.isPending };
}
