import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStatus, type Server } from "@/modules/server";
import { upsertServerInList } from "@/modules/server/api/servers.queries";
import { useBlueprints, useBlueprintVersions } from "@/modules/server-types/api/server-types.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { qk } from "@/shared/queries/query-keys";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { isOffline } from "@/modules/server/hooks/useServerMeta";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/** Key of the variable whose options come from the version list */
const versionKeyOf = (blueprint?: BlueprintSummary) => blueprint?.variables.find((v) => v.options?.from === "versions")?.key;

/** Blueprint that runs a user supplied jar and needs an upload */
const CUSTOM_BLUEPRINT_ID = "com.kubek.custom";

/** Switching a stopped server to another core and version */
export function useServerCoreSettings(server: Server) {
  const { notify } = useNotifications();
  const { t } = useTranslation("modules.serverSettings.general.coreSettings");
  const queryClient = useQueryClient();

  const isStopped = isOffline(useServerStatus(server.id, server.status));

  const { data: blueprints = [], isLoading: blueprintsLoading } = useBlueprints();
  const currentBlueprint = blueprints.find((b) => b.id === server.blueprintId);
  const currentVersionKey = versionKeyOf(currentBlueprint);
  const currentVersion = currentVersionKey ? String(server.variables?.[currentVersionKey] ?? "") : undefined;

  const [blueprintId, setBlueprintIdState] = useState<string>(server.blueprintId);
  const [pickedVersion, setPickedVersion] = useState<string | null>(null);
  const [customFile, setCustomFile] = useState<File | undefined>();

  const chosenBlueprint = blueprints.find((b) => b.id === blueprintId);
  const hasVersions = !!versionKeyOf(chosenBlueprint);
  const isCustomChosen = blueprintId === CUSTOM_BLUEPRINT_ID;
  const { data: versions = [], isLoading: versionsLoading } = useBlueprintVersions(hasVersions ? blueprintId : undefined);

  // Staying on the same core keeps its version, another core starts at the newest one
  const defaultVersion = blueprintId === server.blueprintId && currentVersion ? currentVersion : versions[0];
  const version = hasVersions ? (pickedVersion ?? defaultVersion) : undefined;

  const setBlueprintId = (id: string) => {
    setBlueprintIdState(id);
    setPickedVersion(null);
  };

  const isDirty =
    blueprintId !== server.blueprintId ||
    (hasVersions && version !== currentVersion) ||
    // Picking the custom core again with a new jar is a change too
    (isCustomChosen && !!customFile);
  const canApply = isStopped && (!hasVersions || !!version) && (!isCustomChosen || !!customFile) && isDirty;

  const mutation = useMutation({
    mutationFn: () => api.servers.changeCore(server.id, { blueprintId, version }, isCustomChosen ? customFile : undefined),
    onSuccess: (res) => {
      if (res?.server) upsertServerInList(queryClient, res.server);
      void queryClient.invalidateQueries({ queryKey: qk.servers.all });
      setCustomFile(undefined);
      notify({ title: t("started"), type: "success" });
    },
    onError: (error) => notify({ title: getApiErrorMessage(error) || t("failed"), type: "error" }),
    meta: { silent: true },
  });

  return {
    blueprints,
    blueprintsLoading,
    blueprintId,
    setBlueprintId,
    hasVersions,
    versions,
    versionsLoading,
    version,
    setVersion: setPickedVersion,
    currentBlueprint,
    currentVersion,
    isStopped,
    isCustomChosen,
    customFile,
    setCustomFile,
    canApply,
    isApplying: mutation.isPending,
    apply: () => mutation.mutate(),
  };
}
