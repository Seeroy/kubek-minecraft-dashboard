import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import {
  useBlueprintVersions,
  useBlueprints,
} from "@/modules/server-types/api/server-types.queries";
import { useServerStatus } from "@/modules/server/store/server-statuses.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { qk } from "@/shared/queries/query-keys";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

/** The key of the variable whose options come from version list */
const versionKeyOf = (blueprint?: BlueprintSummary): string | undefined =>
  blueprint?.variables.find((v) => v.options?.from === "versions")?.key;

/** Blueprint that runs a user-supplied jar and needs an upload */
const CUSTOM_BLUEPRINT_ID = "com.kubek.custom";

/**
 * State + persistence for changing a server's core (blueprint) and version
 */
export const useServerCoreSettings = () => {
  const { selectedServer, updateServer } = useServerStore();
  const { notify } = useNotifications();
  const { t } = useTranslation("modules.serverSettings");
  const queryClient = useQueryClient();

  // Prefer the live status over the (possibly stale) cached server record
  const liveStatus = useServerStatus(selectedServer?.id);
  const isStopped =
    (liveStatus?.status ?? selectedServer?.status) === "stopped";

  const { data: blueprints, isLoading: blueprintsLoading } = useBlueprints();

  const currentBlueprintId = selectedServer?.blueprintId;
  const currentBlueprint = useMemo(
    () => blueprints?.find((b) => b.id === currentBlueprintId),
    [blueprints, currentBlueprintId]
  );
  const currentVersionKey = versionKeyOf(currentBlueprint);
  const currentVersion = currentVersionKey
    ? String(selectedServer?.variables?.[currentVersionKey] ?? "")
    : undefined;

  const [blueprintId, setBlueprintId] = useState<string | undefined>(
    currentBlueprintId
  );
  const [version, setVersion] = useState<string | undefined>(currentVersion);
  const [customFile, setCustomFile] = useState<File | undefined>(undefined);

  // Reset the form whenever a different server is selected
  useEffect(() => {
    setBlueprintId(currentBlueprintId);
    setVersion(currentVersion);
    setCustomFile(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServer?.id]);

  const chosenBlueprint = useMemo(
    () => blueprints?.find((b) => b.id === blueprintId),
    [blueprints, blueprintId]
  );
  const hasVersions = !!versionKeyOf(chosenBlueprint);
  const isCustomChosen = blueprintId === CUSTOM_BLUEPRINT_ID;

  const selectableBlueprints = useMemo(() => blueprints ?? [], [blueprints]);

  const { data: versions, isLoading: versionsLoading } = useBlueprintVersions(
    hasVersions ? blueprintId : undefined
  );

  // Default the version: keep the server's current version when staying on the
  // same core, otherwise fall back to the newest offered version
  useEffect(() => {
    if (!hasVersions) {
      setVersion(undefined);
      return;
    }
    if (blueprintId === currentBlueprintId && currentVersion) {
      setVersion(currentVersion);
    } else if (versions?.length) {
      setVersion((prev) =>
        prev && versions.includes(prev) ? prev : versions[0]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprintId, hasVersions, versions]);

  const isDirty =
    blueprintId !== currentBlueprintId ||
    (hasVersions && version !== currentVersion) ||
    // Re-selecting the custom core with a new jar counts as a change
    (isCustomChosen && !!customFile);
  const canApply =
    isStopped &&
    !!blueprintId &&
    (!hasVersions || !!version) &&
    (!isCustomChosen || !!customFile) &&
    isDirty;

  const mutation = useMutation({
    mutationFn: () =>
      api.servers.changeCore(
        selectedServer!.id,
        {
          blueprintId: blueprintId!,
          version: hasVersions ? version : undefined,
        },
        isCustomChosen ? customFile : undefined
      ),
    onSuccess: (res) => {
      if (res?.server) updateServer(selectedServer!.id, res.server);
      queryClient.invalidateQueries({ queryKey: qk.servers.all });
      setCustomFile(undefined);
    },
    onError: (error: { message?: string }) =>
      notify({
        title: error?.message || t("general.coreSettings.failed"),
        type: "error",
      }),
  });

  return {
    selectedServer,
    blueprints: selectableBlueprints,
    blueprintsLoading,
    blueprintId,
    setBlueprintId,
    chosenBlueprint,
    hasVersions,
    versions: versions ?? [],
    versionsLoading,
    version,
    setVersion,
    currentBlueprint,
    currentVersion,
    isStopped,
    isCustomChosen,
    customFile,
    setCustomFile,
    canApply,
    isApplying: mutation.isPending,
    applyCoreChange: () => mutation.mutate(),
  };
};
