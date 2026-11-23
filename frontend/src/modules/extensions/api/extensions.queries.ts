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

/** login.footer slots for the sign-in page, works without a session */
export function useExtensionLoginSlots() {
  return useQuery({
    queryKey: qk.extensions.loginSlots(),
    queryFn: () => api.extensions.loginSlots(),
    staleTime: 5 * 60_000,
    retry: false,
    // An empty footer is fine when the panel is unreachable
    meta: { silent: true },
  });
}

/** Palette commands of active extensions the user may run */
export function useExtensionCommands(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.extensions.commands(),
    queryFn: () => api.extensions.commands(),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    meta: { silent: true },
  });
}

export function useRunExtensionCommandMutation() {
  return useMutation({
    mutationFn: (input: { extId: string; commandId: string }) => api.extensions.runCommand(input.extId, input.commandId),
    // the palette shows the extension's own error text
    meta: { silent: true },
  });
}

export function useExtensionSettings(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.extensions.settings(id),
    queryFn: () => api.extensions.settings(id),
    enabled: options.enabled ?? true,
    // the dialog shows its own error
    meta: { silent: true },
  });
}

export function useUpdateExtensionSettingsMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) => api.extensions.updateSettings(id, { values }),
    // field errors are shown in the form
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.extensions.settings(id) }),
  });
}
