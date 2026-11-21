import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  AddBanRequest,
  AddIpBanRequest,
  AddOpRequest,
  GamemodeRequest,
  KickRequest,
  KnownPlayersPage,
  KnownPlayersParams,
  PlayerDetails,
  PlayersOverview,
  ResolvedPlayer,
  TeleportRequest,
  UpdatePlayersSettingsRequest,
} from "./players.model";

// Every list change answers with the fresh overview
export class PlayersApi {
  constructor(private authHttp: AuthHttpClient) {}

  private base = (serverId: string) => `servers/${serverId}/players`;

  getOverview = (serverId: string): Promise<PlayersOverview> => this.authHttp.get<PlayersOverview>(this.base(serverId));

  resolve = (serverId: string, name: string): Promise<ResolvedPlayer> =>
    this.authHttp.get<ResolvedPlayer>(`${this.base(serverId)}/resolve`, { searchParams: { name } });

  updateSettings = (serverId: string, data: UpdatePlayersSettingsRequest): Promise<PlayersOverview> =>
    this.authHttp.put<PlayersOverview>(`${this.base(serverId)}/settings`, { json: data });

  addToWhitelist = (serverId: string, name: string): Promise<PlayersOverview> =>
    this.authHttp.post<PlayersOverview>(`${this.base(serverId)}/whitelist`, { json: { name } });

  removeFromWhitelist = (serverId: string, name: string): Promise<PlayersOverview> =>
    this.authHttp.delete<PlayersOverview>(`${this.base(serverId)}/whitelist/${encodeURIComponent(name)}`);

  addOp = (serverId: string, data: AddOpRequest): Promise<PlayersOverview> => this.authHttp.post<PlayersOverview>(`${this.base(serverId)}/ops`, { json: data });

  removeOp = (serverId: string, name: string): Promise<PlayersOverview> =>
    this.authHttp.delete<PlayersOverview>(`${this.base(serverId)}/ops/${encodeURIComponent(name)}`);

  addBan = (serverId: string, data: AddBanRequest): Promise<PlayersOverview> =>
    this.authHttp.post<PlayersOverview>(`${this.base(serverId)}/bans`, { json: data });

  removeBan = (serverId: string, name: string): Promise<PlayersOverview> =>
    this.authHttp.delete<PlayersOverview>(`${this.base(serverId)}/bans/${encodeURIComponent(name)}`);

  addIpBan = (serverId: string, data: AddIpBanRequest): Promise<PlayersOverview> =>
    this.authHttp.post<PlayersOverview>(`${this.base(serverId)}/ip-bans`, { json: data });

  removeIpBan = (serverId: string, ip: string): Promise<PlayersOverview> =>
    this.authHttp.delete<PlayersOverview>(`${this.base(serverId)}/ip-bans/${encodeURIComponent(ip)}`);

  kick = async (serverId: string, data: KickRequest): Promise<void> => {
    await this.authHttp.post<void>(`${this.base(serverId)}/kick`, { json: data });
  };

  getKnown = (serverId: string, { page, pageSize, search }: KnownPlayersParams): Promise<KnownPlayersPage> =>
    this.authHttp.get<KnownPlayersPage>(`${this.base(serverId)}/known`, {
      searchParams: { page, pageSize, ...(search ? { search } : {}) },
    });

  /** By UUID, or by name for an online player */
  getDetails = (serverId: string, id: string): Promise<PlayerDetails> =>
    this.authHttp.get<PlayerDetails>(`${this.base(serverId)}/known/${encodeURIComponent(id)}`);

  resetData = (serverId: string, uuid: string): Promise<{ deleted: number }> =>
    this.authHttp.delete<{ deleted: number }>(`${this.base(serverId)}/known/${encodeURIComponent(uuid)}`);

  setGamemode = async (serverId: string, data: GamemodeRequest): Promise<void> => {
    await this.authHttp.post<void>(`${this.base(serverId)}/gamemode`, { json: data });
  };

  teleport = async (serverId: string, data: TeleportRequest): Promise<void> => {
    await this.authHttp.post<void>(`${this.base(serverId)}/teleport`, { json: data });
  };

  heal = async (serverId: string, name: string): Promise<void> => {
    await this.authHttp.post<void>(`${this.base(serverId)}/heal`, { json: { name } });
  };

  feed = async (serverId: string, name: string): Promise<void> => {
    await this.authHttp.post<void>(`${this.base(serverId)}/feed`, { json: { name } });
  };
}

export const playersApi = new PlayersApi(authHttp);
