"use client";

import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { type Server, useServerStatus } from "@/modules/server";
import { upsertServerInList } from "@/modules/server/api/servers.queries";
import { useBlueprints } from "@/modules/server-types/api/server-types.queries";
import { SAVE_CONFIRMATION_MODAL_ID } from "@/modules/server-settings/modals/SaveConfirmationModal";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { ApiError } from "@/shared/lib/http";
import { hasServerProperties } from "@/shared/lib/serverRestrictions";
import { qk } from "@/shared/queries/query-keys";
import { ServerStatus } from "@shared/types/server/server.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PROPERTY_TAB, type SettingsTab } from "../lib/schema";

type VariableValue = string | number | boolean;
type RestartOnError = { enabled: boolean; attempts: number };

// Edited on the Java tab, every other variable belongs to General
export const JAVA_VARIABLES = new Set(["JAVA_VERSION", "JAVA_PATH", "XMX", "XMS", "JVM_ARGS"]);
const DEFAULT_RESTART: RestartOnError = { enabled: false, attempts: 3 };

/**
 * Unsaved edits for one server, layered over the saved values
 * Server settings (name, auto restart, variables) and server.properties
 * are separate endpoints, one save writes whichever of them changed
 */
export function useSettingsDraft(server: Server) {
  const { t } = useTranslation("modules.serverSettings.notifications");
  const { t: tState } = useTranslation("modules.serverSettings.state");
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const { open: openModal } = useModal();
  const status = useServerStatus(server.id, server.status);
  // A stopped server reads server.properties on its next start anyway
  const running = status === ServerStatus.RUNNING || status === ServerStatus.STARTING;

  const blueprints = useBlueprints();
  const blueprint = blueprints.data?.find((b) => b.id === server.blueprintId);
  // Unknown blueprint still tries the file, proxies skip it
  const withProperties = !blueprints.isPending && (!blueprint || hasServerProperties(blueprint));

  const propertiesQuery = useQuery({
    queryKey: qk.servers.properties(server.id),
    queryFn: () => api.servers.getProperties(server.id),
    enabled: withProperties,
  });
  const detailQuery = useQuery({
    queryKey: qk.servers.byId(server.id),
    queryFn: () => api.servers.getById(server.id),
  });

  const savedProps = useMemo(() => propertiesQuery.data ?? {}, [propertiesQuery.data]);
  const saved = {
    name: detailQuery.data?.name ?? server.name,
    restartOnError: (detailQuery.data?.restartOnError as RestartOnError | undefined) ?? DEFAULT_RESTART,
    variables: (detailQuery.data?.variables ?? server.variables ?? {}) as Record<string, VariableValue>,
  };

  const [props, setProps] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [name, setNameDraft] = useState<string | null>(null);
  const [restart, setRestartDraft] = useState<RestartOnError | null>(null);
  const [variables, setVariables] = useState<Record<string, VariableValue>>({});

  const property = (key: string) => props[key] ?? savedProps[key] ?? "";
  const propertyChanged = (key: string) => key in props || removed.has(key);

  const setProperty = (key: string, value: string) => {
    if (removed.has(key)) {
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    setProps((prev) => {
      const next = { ...prev };
      if (savedProps[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const removeProperty = (key: string) => {
    setProps((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key in savedProps) setRemoved((prev) => new Set(prev).add(key));
  };

  const values = {
    name: name ?? saved.name,
    restartOnError: restart ?? saved.restartOnError,
    variable: (key: string) => (key in variables ? variables[key] : saved.variables[key]),
  };

  const setName = (value: string) => setNameDraft(value === saved.name ? null : value);
  const setRestart = (value: RestartOnError) =>
    setRestartDraft(
      value.enabled === saved.restartOnError.enabled && value.attempts === saved.restartOnError.attempts ? null : value
    );
  const setVariable = (key: string, value: VariableValue) =>
    setVariables((prev) => {
      const next = { ...prev };
      if (saved.variables[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });

  const counts = useMemo(() => {
    const result: Partial<Record<SettingsTab, number>> = {};
    const bump = (tab: SettingsTab) => (result[tab] = (result[tab] ?? 0) + 1);
    for (const key of [...Object.keys(props), ...removed]) bump(PROPERTY_TAB[key] ?? "other");
    for (const key of Object.keys(variables)) bump(JAVA_VARIABLES.has(key) ? "java" : "general");
    if (name !== null) bump("general");
    if (restart !== null) bump("general");
    return result;
  }, [props, removed, variables, name, restart]);
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  const reset = () => {
    setProps({});
    setRemoved(new Set());
    setNameDraft(null);
    setRestartDraft(null);
    setVariables({});
  };

  const save = useMutation({
    mutationFn: async () => {
      const settingsChanged = name !== null || restart !== null || Object.keys(variables).length > 0;
      const propsChanged = Object.keys(props).length > 0 || removed.size > 0;

      if (settingsChanged) {
        const updated = await api.servers
          .updateSettings(server.id, {
            ...(name !== null && { name }),
            ...(restart !== null && { restartOnError: restart }),
            ...(Object.keys(variables).length > 0 && { variables }),
          })
          .catch((error: unknown) => {
            if (error instanceof ApiError && error.message.includes("NAME_TAKEN")) throw new Error(t("nameTaken"));
            throw error;
          });
        upsertServerInList(queryClient, updated);
      }
      if (propsChanged) {
        // Saving over a file that never loaded would wipe every key the user did not touch
        if (!propertiesQuery.data) throw new Error(tState("loadFailed"));
        const merged = { ...savedProps, ...props };
        for (const key of removed) delete merged[key];
        await api.servers.saveProperties(server.id, merged);
      }
      return { propsChanged };
    },
    onSuccess: async ({ propsChanged }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.servers.properties(server.id) }),
        queryClient.invalidateQueries({ queryKey: qk.servers.byId(server.id) }),
      ]);
      reset();
      // server.properties is only read on start, offer a restart while it runs
      if (propsChanged && running) {
        void openModal(SAVE_CONFIRMATION_MODAL_ID, {
          onConfirm: () =>
            api.servers.restart(server.id).then(
              () => notify({ title: t("serverRestartInitiated"), type: "success" }),
              (error: unknown) => notify({ title: getApiErrorMessage(error), type: "error" })
            ),
          onCancel: () => notify({ title: t("settingsSaved"), type: "success" }),
        });
      } else {
        notify({ title: t("settingUpdated"), type: "success" });
      }
    },
  });

  return {
    loading: blueprints.isPending || propertiesQuery.isLoading || detailQuery.isLoading,
    loadFailed: propertiesQuery.isError || detailQuery.isError,
    // refetch ignores enabled, so a proxy must not ask for the file here
    retry: () => Promise.all([withProperties && propertiesQuery.refetch(), detailQuery.refetch()]),
    savedProps,
    removed,
    addedKeys: Object.keys(props).filter((key) => !(key in savedProps)),
    property,
    propertyChanged,
    setProperty,
    removeProperty,
    values,
    nameChanged: name !== null,
    restartChanged: restart !== null,
    variableChanged: (key: string) => key in variables,
    setName,
    setRestart,
    setVariable,
    counts,
    total,
    reset,
    save: () => save.mutate(),
    saving: save.isPending,
  };
}

export type SettingsDraft = ReturnType<typeof useSettingsDraft>;
