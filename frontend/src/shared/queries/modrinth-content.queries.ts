import { contentApi, type ContentKind, type ContentSearchParams } from "@/api";
import { keepPreviousData, useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./query-keys";

const keysFor = (kind: ContentKind) => (kind === "mod" ? qk.mods : qk.plugins);

// Modrinth project data barely changes while a dialog is open
const PROJECT_STALE_MS = 5 * 60_000;

export function useInstalledContent(kind: ContentKind, serverId: string | undefined) {
  return useQuery({
    queryKey: keysFor(kind).installed(serverId ?? ""),
    queryFn: () => contentApi(kind).getInstalled(serverId!),
    enabled: !!serverId,
  });
}

export function useAvailableContentInfinite(
  kind: ContentKind,
  { pageSize, ...params }: Omit<ContentSearchParams, "offset" | "limit"> & { pageSize: number }
) {
  return useInfiniteQuery({
    queryKey: keysFor(kind).search(params),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => contentApi(kind).search({ ...params, query: params.query || undefined, limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.hits.length, 0);
      return loaded < lastPage.total_hits ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

export function useContentProject(kind: ContentKind, projectId: string | undefined) {
  return useQuery({
    queryKey: keysFor(kind).project(projectId ?? ""),
    queryFn: () => contentApi(kind).getProject(projectId!),
    enabled: !!projectId,
    staleTime: PROJECT_STALE_MS,
  });
}

/** Several projects at once, for naming dependencies */
export function useContentProjects(kind: ContentKind, projectIds: string[]) {
  return useQueries({
    queries: projectIds.map((id) => ({
      queryKey: keysFor(kind).project(id),
      queryFn: () => contentApi(kind).getProject(id),
      staleTime: PROJECT_STALE_MS,
    })),
  });
}

export function useContentVersions(kind: ContentKind, projectId: string | undefined) {
  return useQuery({
    queryKey: keysFor(kind).versions(projectId ?? ""),
    queryFn: () => contentApi(kind).getProjectVersions(projectId!),
    enabled: !!projectId,
    staleTime: PROJECT_STALE_MS,
  });
}

function useInvalidateInstalled(kind: ContentKind, serverId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: keysFor(kind).installed(serverId) });
}

export function useInstallContentMutation(kind: ContentKind, serverId: string) {
  const onSuccess = useInvalidateInstalled(kind, serverId);
  return useMutation({
    mutationFn: (payload: Parameters<ReturnType<typeof contentApi>["install"]>[0]) => contentApi(kind).install(payload),
    onSuccess,
  });
}

export function useUpdateContentMutation(kind: ContentKind, serverId: string) {
  const onSuccess = useInvalidateInstalled(kind, serverId);
  return useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload: Parameters<ReturnType<typeof contentApi>["update"]>[2] }) =>
      contentApi(kind).update(serverId, recordId, payload),
    onSuccess,
  });
}

export function useRemoveContentMutation(kind: ContentKind, serverId: string) {
  const onSuccess = useInvalidateInstalled(kind, serverId);
  return useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload?: Parameters<ReturnType<typeof contentApi>["remove"]>[2] }) =>
      contentApi(kind).remove(serverId, recordId, payload),
    onSuccess,
  });
}
