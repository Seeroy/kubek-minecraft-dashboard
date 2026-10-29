import { api, type BulkDeleteResult } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import type { IServer } from "@shared/types/server/server.types";
import type { WsServerListItem } from "@shared/types/ws/server-payloads.types";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerStatusesStore } from "../store/server-statuses.store";
import type { Server } from "../types";

const toServer = (server: IServer): Server => ({
  ...server,
  folderId: server.folderId ?? null,
});

const seed = (servers: Server[]) => {
  useServerStatusesStore.getState().seedFromList(servers);
  return servers;
};

/**
 * Servers you can see. Loaded over HTTP and on qk.servers.all invalidation,
 * server:list from the socket keeps it fresh
 */
export function useServersListQuery() {
  const token = useAuthStore((s) => s.token);
  // GET /servers needs read in a server area, the socket list does not
  const canView = useAuthStore((s) => s.seesServers());
  return useQuery({
    queryKey: qk.servers.list(),
    queryFn: async () => seed((await api.servers.getAll()).map(toServer)),
    enabled: !!token && canView,
    staleTime: Infinity,
    meta: { silent: true },
  });
}

/** Apply server:list, socket rows miss some fields so keep the ones we have */
export function applyServerListPush(qc: QueryClient, rows: WsServerListItem[]) {
  qc.setQueryData<Server[]>(qk.servers.list(), (prev) => {
    const known = new Map(prev?.map((server) => [server.id, server]));
    return rows.map((row) => ({ ...known.get(row.id), ...row }));
  });
  seed(rows);
}

/** Put a server from a mutation into the list right away */
export function upsertServerInList(qc: QueryClient, server: IServer) {
  const next = toServer(server);
  qc.setQueryData<Server[]>(qk.servers.list(), (prev = []) =>
    prev.some((s) => s.id === next.id)
      ? prev.map((s) => (s.id === next.id ? { ...s, ...next } : s))
      : [next, ...prev]
  );
  seed([next]);
}

export function patchServersInList(
  qc: QueryClient,
  ids: string[],
  patch: Partial<Server>
) {
  qc.setQueryData<Server[]>(qk.servers.list(), (prev) =>
    prev?.map((s) => (ids.includes(s.id) ? { ...s, ...patch } : s))
  );
}

export function useDuplicateServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.servers.duplicate(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}

export function useRenameServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.servers.updateSettings(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}

export function useDeleteServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      password,
      confirmName,
    }: {
      id: string;
      password: string;
      confirmName: string;
    }) => api.servers.remove(id, { password, confirmName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}

export function useBulkDeleteServersMutation() {
  const qc = useQueryClient();
  return useMutation<
    BulkDeleteResult,
    Error,
    { ids: string[]; password: string }
  >({
    mutationFn: ({ ids, password }) => api.servers.bulkRemove(ids, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}

export function useImportServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ archive, name }: { archive: File; name?: string }) =>
      api.servers.importArchive(archive, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}
