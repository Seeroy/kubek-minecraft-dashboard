"use client";

import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { AccessArea } from "@shared/access/areas";
import { useInstallCompanionMutation } from "../api/companion.queries";

/** Install or update from GitHub releases with the toasts around it */
export function useCompanionInstall(serverId: string) {
  const { t } = useTranslation("modules.companion.install");
  const { notify } = useNotifications();
  const mutation = useInstallCompanionMutation(serverId);
  const allowed = useAccess([AccessArea.CONTENT, "write"], serverId);

  const install = async () => {
    try {
      const result = await mutation.mutateAsync();
      notify({
        type: "success",
        title: t("done", result.installed.version),
        message: result.restartRequired ? t("restartHint") : t("startHint"),
      });
    } catch (error) {
      notify({ type: "error", title: t("failed"), message: getApiErrorMessage(error) });
    }
  };

  return { install, pending: mutation.isPending, allowed };
}
