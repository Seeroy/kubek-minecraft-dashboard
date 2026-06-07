import { contentApi, type ContentKind } from "@/api";
import type { ModrinthSearchResponse } from "@shared/types/plugins";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { qk } from "./query-keys";

function keysFor(kind: ContentKind) {
  return kind === "mod" ? qk.mods : qk.plugins;
}

export function useInstalledContent(
  kind: ContentKind,
  serverId: string | undefined
) {
  const keys = keysFor(kind);
  return useQuery({
    queryKey: keys.installed(serverId ?? ""),
    queryFn: () => contentApi(kind).getInstalled(serverId!),
    enabled: !!serverId,
  });
}

interface InfiniteContentParams {
  query: string;
  pageSize: number;
  gameVersion?: string;
  loader?: string;
  categories?: string[];
}

export function useAvailableContentInfinite(
  kind: ContentKind,
  params: InfiniteContentParams
) {
  const keys = keysFor(kind);
  return useInfiniteQuery({
    queryKey: keys.availableInfinite(
      params.query,
      params.gameVersion,
      params.loader
    ),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      contentApi(kind).search({
        query: params.query || undefined,
        limit: params.pageSize,
        offset: pageParam,
        gameVersion: params.gameVersion,
        loader: params.loader,
        categories: params.categories,
      }),
    getNextPageParam: (
      lastPage: ModrinthSearchResponse,
      allPages: ModrinthSearchResponse[]
    ) => {
      const loaded = allPages.reduce((acc, p) => acc + p.hits.length, 0);
      return loaded < lastPage.total_hits ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

export function useInstallContentMutation(kind: ContentKind, serverId: string) {
  const queryClient = useQueryClient();
  const keys = keysFor(kind);
  return useMutation({
    mutationFn: (
      payload: Parameters<ReturnType<typeof contentApi>["install"]>[0]
    ) => contentApi(kind).install(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.installed(serverId) }),
  });
}

export function useUpdateContentMutation(kind: ContentKind, serverId: string) {
  const queryClient = useQueryClient();
  const keys = keysFor(kind);
  return useMutation({
    mutationFn: ({
      recordId,
      payload,
    }: {
      recordId: string;
      payload: Parameters<ReturnType<typeof contentApi>["update"]>[2];
    }) => contentApi(kind).update(serverId, recordId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.installed(serverId) }),
  });
}

export function useRemoveContentMutation(kind: ContentKind, serverId: string) {
  const queryClient = useQueryClient();
  const keys = keysFor(kind);
  return useMutation({
    mutationFn: ({
      recordId,
      payload,
    }: {
      recordId: string;
      payload?: Parameters<ReturnType<typeof contentApi>["remove"]>[2];
    }) => contentApi(kind).remove(serverId, recordId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.installed(serverId) }),
  });
}
