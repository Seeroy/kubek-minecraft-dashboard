import { api } from "@/api";
import type { Capability } from "@kubekpanel/extension-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

/** Installed extensions (management view) */
export function useExtensions(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.extensions.list(),
    queryFn: () => api.extensions.list(),
    enabled: options.enabled ?? true,
  });
}

/** Active frontend-contributing extensions */
export function useExtensionRegistry(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.extensions.registry(),
    queryFn: () => api.extensions.registry(),
    enabled: options.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

export function useInstallExtensionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.extensions.install(file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.extensions.all }),
  });
}

export function useConsentExtensionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; capabilities: Capability[] }) =>
      api.extensions.consent(input.id, input.capabilities),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.extensions.all }),
  });
}

export function useEnableExtensionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.extensions.enable(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.extensions.all }),
  });
}

export function useDisableExtensionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.extensions.disable(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.extensions.all }),
  });
}

export function useRemoveExtensionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.extensions.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.extensions.all }),
  });
}

/** KubekPanel/extensions catalog, the backend caches it for 10 minutes */
export function useExtensionsCatalog(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.extensions.catalog(),
    queryFn: () => api.extensions.catalog(),
    enabled: options.enabled ?? true,
    staleTime: 5 * 60_000,
    // the tab shows its own error with a retry
    meta: { silent: true },
  });
}

export function useInstallExtensionFromCatalogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.extensions.installFromCatalog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.extensions.all }),
  });
}

/** Skips the backend cache, for the refresh button */
export function useRefreshExtensionsCatalogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.extensions.catalog(true),
    onSuccess: (data) => queryClient.setQueryData(qk.extensions.catalog(), data),
  });
}
