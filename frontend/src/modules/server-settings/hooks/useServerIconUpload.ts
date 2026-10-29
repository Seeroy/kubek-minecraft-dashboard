import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { qk } from "@/shared/queries/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, type ChangeEvent } from "react";

/** Hidden file input wiring for the server icon, the shared avatar cache shows the result */
export function useServerIconUpload(serverId: string) {
  const { t } = useTranslation("modules.serverSettings.notifications");
  const { notify } = useNotifications();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (file: File) => api.servers.uploadIcon(serverId, file),
    onSuccess: () => {
      notify({ title: t("serverIconUploaded"), type: "success" });
      void queryClient.invalidateQueries({ queryKey: qk.servers.icon(serverId) });
    },
    onError: (error) => notify({ title: getApiErrorMessage(error), type: "error" }),
    meta: { silent: true },
  });

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify({ title: t("selectImageFile"), type: "error" });
      return;
    }
    upload.mutate(file);
  };

  return { inputRef, onChange, pick: () => inputRef.current?.click(), uploading: upload.isPending };
}
