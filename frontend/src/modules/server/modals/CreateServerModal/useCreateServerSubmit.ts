import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useMoveServersMutation } from "@/modules/server/api/server-folders.queries";
import { upsertServerInList } from "@/modules/server/api/servers.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ApiError } from "@/shared/lib/http";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useServerCreationStore } from "../../store/server-creation.store";
import { startIfRequested } from "../../ui/ServerCreationBridge";
import { blueprintNeedsCoreFile, type WizardValues } from "./wizard/buildBlueprintSchema";
import { buildCreatePayload } from "./wizard/buildCreatePayload";

interface UseCreateServerSubmitOptions {
  form: UseFormReturn<WizardValues>;
  blueprint: BlueprintSummary | undefined;
  docker: boolean;
  dockerAvailable: boolean;
  onCreated: (taskId: string) => void;
}

export function useCreateServerSubmit({ form, blueprint, docker, dockerAvailable, onCreated }: UseCreateServerSubmitOptions) {
  const { t } = useTranslation("modules.newServerModal");
  const { notify } = useNotifications();
  const queryClient = useQueryClient();
  const moveServers = useMoveServersMutation();
  const setAutostart = useServerCreationStore((s) => s.setAutostart);

  const errorMessage = (error: unknown) => {
    if (error instanceof ApiError && error.message.includes("NAME_TAKEN")) return t("modal.notifications.nameTaken");
    return error instanceof Error ? error.message : t("modal.notifications.creationError");
  };

  return form.handleSubmit(async (values) => {
    if (!blueprint) return;
    const payload = buildCreatePayload(blueprint, values, { docker, dockerAvailable });

    try {
      const response = await api.servers.create(payload, blueprintNeedsCoreFile(blueprint) ? values.customFile : undefined);
      upsertServerInList(queryClient, response.server);
      if (values.folderId) moveServers.mutate({ serverIds: [response.server.id], folderId: values.folderId });
      if (values.autostart) {
        setAutostart(response.taskId, true);
        // The task may already be done by the time the response lands
        startIfRequested(response.taskId);
      }
      onCreated(response.taskId);
    } catch (error) {
      notify({
        type: "error",
        title: t("modal.notifications.creationFailed"),
        message: errorMessage(error),
        duration: 8000,
        icon: TriangleAlert,
      });
    }
  });
}
