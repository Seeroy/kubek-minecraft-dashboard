import {
  api,
  type AddBanRequest,
  type AddIpBanRequest,
  type AddOpRequest,
  type KickRequest,
  type PlayersOverview,
  type UpdatePlayersSettingsRequest,
} from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePlayersOverview(serverId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.players.overview(serverId ?? ""),
    queryFn: () => api.players.getOverview(serverId!),
    enabled: enabled && !!serverId,
    // A running server edits the lists itself, keep them reasonably fresh
    refetchInterval: 30_000,
  });
}

export type PlayersChange =
  | { kind: "whitelistAdd"; name: string }
  | { kind: "whitelistRemove"; name: string }
  | { kind: "opAdd"; data: AddOpRequest }
  | { kind: "opRemove"; name: string }
  | { kind: "banAdd"; data: AddBanRequest }
  | { kind: "banRemove"; name: string }
  | { kind: "ipBanAdd"; data: AddIpBanRequest }
  | { kind: "ipBanRemove"; ip: string }
  | { kind: "settings"; data: UpdatePlayersSettingsRequest };

type Sender<K extends PlayersChange["kind"]> = (serverId: string, change: Extract<PlayersChange, { kind: K }>) => Promise<PlayersOverview>;

const SENDERS: { [K in PlayersChange["kind"]]: Sender<K> } = {
  whitelistAdd: (id, c) => api.players.addToWhitelist(id, c.name),
  whitelistRemove: (id, c) => api.players.removeFromWhitelist(id, c.name),
  opAdd: (id, c) => api.players.addOp(id, c.data),
  opRemove: (id, c) => api.players.removeOp(id, c.name),
  banAdd: (id, c) => api.players.addBan(id, c.data),
  banRemove: (id, c) => api.players.removeBan(id, c.name),
  ipBanAdd: (id, c) => api.players.addIpBan(id, c.data),
  ipBanRemove: (id, c) => api.players.removeIpBan(id, c.ip),
  settings: (id, c) => api.players.updateSettings(id, c.data),
};

export const sendPlayersChange = (serverId: string, change: PlayersChange) => (SENDERS[change.kind] as Sender<typeof change.kind>)(serverId, change);

/** Every change answers with the whole overview, it replaces the cache */
export function usePlayersChangeMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: PlayersChange) => sendPlayersChange(serverId, change),
    onSuccess: (overview) => queryClient.setQueryData(qk.players.overview(serverId), overview),
  });
}

export function useResolvePlayerMutation(serverId: string) {
  return useMutation({ mutationFn: (name: string) => api.players.resolve(serverId, name) });
}

export function useKickPlayerMutation(serverId: string) {
  return useMutation({ mutationFn: (data: KickRequest) => api.players.kick(serverId, data) });
}
