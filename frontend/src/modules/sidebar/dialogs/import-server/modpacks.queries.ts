import { api, type InstallModpackProps } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const SEARCH_LIMIT = 12;
// Pack versions do not change while the dialog is open
const VERSIONS_STALE_MS = 5 * 60_000;

export function useModpackSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.modpacks.search({ query }),
    queryFn: () => api.modpacks.search({ query: query || undefined, limit: SEARCH_LIMIT, index: query ? "relevance" : "downloads" }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useModpackVersions(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.modpacks.versions(projectId ?? ""),
    queryFn: () => api.modpacks.getVersions(projectId!),
    enabled: !!projectId,
    staleTime: VERSIONS_STALE_MS,
  });
}

export function useInspectModpackMutation() {
  return useMutation({ mutationFn: ({ file }: { file: File }) => api.modpacks.inspectFile(file) });
}

/** Returns the id of the download task, its stages carry the progress */
export function useStartModrinthInspect() {
  return useMutation({
    mutationFn: ({ projectId, versionId }: { projectId: string; versionId: string }) => api.modpacks.inspectModrinth(projectId, versionId),
  });
}

export function useInstallModpackMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InstallModpackProps) => api.modpacks.install(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}
