import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { AddBanRequest, AddIpBanRequest, AddOpRequest, KickRequest, PlayersOverview, ResolvedPlayer, UpdatePlayersSettingsRequest } from "./players.model";

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
}

export const playersApi = new PlayersApi(authHttp);
