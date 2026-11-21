import {
  api,
  type AddBanRequest,
  type AddIpBanRequest,
  type AddOpRequest,
  type GamemodeRequest,
  type KickRequest,
  type KnownPlayersParams,
  type PlayersOverview,
  type TeleportRequest,
  type UpdatePlayersSettingsRequest,
} from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useKnownPlayers(serverId: string, params: KnownPlayersParams, enabled = true) {
  const search = params.search ?? "";
  return useQuery({
    queryKey: qk.players.knownPage(serverId, params.page, params.pageSize, search),
    queryFn: () => api.players.getKnown(serverId, params),
    enabled: enabled && !!serverId,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

/** By UUID, or by name for an online player */
export function usePlayerDetails(serverId: string, id: string) {
  return useQuery({
    queryKey: qk.players.details(serverId, id),
    queryFn: () => api.players.getDetails(serverId, id),
    // Player files are saved every few minutes
    refetchInterval: 15_000,
  });
}

export type PlayerCommand =
  | { kind: "gamemode"; data: GamemodeRequest }
  | { kind: "teleport"; data: TeleportRequest }
  | { kind: "heal"; name: string }
  | { kind: "feed"; name: string };

const sendCommand = (serverId: string, command: PlayerCommand) => {
  switch (command.kind) {
    case "gamemode":
      return api.players.setGamemode(serverId, command.data);
    case "teleport":
      return api.players.teleport(serverId, command.data);
    case "heal":
      return api.players.heal(serverId, command.name);
    case "feed":
      return api.players.feed(serverId, command.name);
  }
};

export function usePlayerCommandMutation(serverId: string) {
  return useMutation({ mutationFn: (command: PlayerCommand) => sendCommand(serverId, command) });
}

export function useResetPlayerDataMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => api.players.resetData(serverId, uuid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.players.known(serverId) }),
  });
}
