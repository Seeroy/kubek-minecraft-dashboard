import { useNotifications } from "@/modules/notifications";
import { useMoveServersMutation } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useCallback } from "react";

/**
 * Move one server into a folder, the mutation updates the list
 */
export function useMoveServerToFolder() {
  const move = useMoveServersMutation();
  const { notify } = useNotifications();
  const { t } = useTranslation("modules.sidebar.serversList");

  return useCallback(
    async (serverId: string, folderId: string | null) => {
      try {
        await move.mutateAsync({ serverIds: [serverId], folderId });
      } catch (error) {
        notify({
          title: t("folders.actionFailed"),
          message: error instanceof Error ? error.message : undefined,
          type: "error",
        });
      }
    },
    [move, notify, t]
  );
}

// Shared key for the native DnD payload
export const SERVER_DND_MIME = "application/x-kubek-server-id";
