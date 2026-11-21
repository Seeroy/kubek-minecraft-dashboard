import { api } from "@/api";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { qk } from "@/shared/queries/query-keys";

/** All installable blueprints. Cached, used both for creation and for resolving server blueprint */
export function useBlueprints(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.serverTypes.list(),
    queryFn: () => api.serverTypes.list(),
    enabled: options.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

/** The blueprint for a given id, resolved from the cached blueprint list */
export function useBlueprint(
  blueprintId: string | undefined
): BlueprintSummary | undefined {
  const { data } = useBlueprints();
  return useMemo(
    () => data?.find((b) => b.id === blueprintId),
    [data, blueprintId]
  );
}

/** Versions offered by a blueprint, resolved through its version engine */
export function useBlueprintVersions(blueprintId: string | undefined) {
  return useQuery({
    queryKey: qk.serverTypes.versions(blueprintId ?? ""),
    queryFn: () => api.serverTypes.getVersions(blueprintId!),
    enabled: !!blueprintId,
  });
}

export function useInstallBlueprintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.serverTypes.install(file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.serverTypes.all }),
  });
}

export function useRemoveBlueprintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.serverTypes.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.serverTypes.all }),
  });
}

/** KubekPanel/blueprints catalog, the backend caches it for 10 minutes */
export function useBlueprintsCatalog(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.serverTypes.catalog(),
    queryFn: () => api.serverTypes.catalog(),
    enabled: options.enabled ?? true,
    staleTime: 5 * 60_000,
    // the tab shows its own error with a retry
    meta: { silent: true },
  });
}

export function useInstallBlueprintFromCatalogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.serverTypes.installFromCatalog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.serverTypes.all }),
  });
}

/** Skips the backend cache, for the refresh button */
export function useRefreshBlueprintsCatalogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.serverTypes.catalog(true),
    onSuccess: (data) => queryClient.setQueryData(qk.serverTypes.catalog(), data),
  });
}
