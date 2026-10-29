import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { Network, NetworkCandidates, NetworkChangeResult, NetworkPlan, NetworkTaskRef, NetworkWizardProps } from "./networks.model";

export class NetworksApi {
  constructor(private authHttp: AuthHttpClient) {}

  list = (): Promise<Network[]> => this.authHttp.get<Network[]>("networks");

  candidates = (): Promise<NetworkCandidates> => this.authHttp.get<NetworkCandidates>("networks/candidates");

  plan = (props: NetworkWizardProps): Promise<NetworkPlan> => this.authHttp.post<NetworkPlan>("networks/plan", { json: props });

  create = (props: NetworkWizardProps): Promise<NetworkTaskRef> => this.authHttp.post<NetworkTaskRef>("networks", { json: props });

  remove = (id: string): Promise<void> => this.authHttp.delete<void>(`networks/${id}`);

  addMember = (id: string, serverId: string): Promise<NetworkTaskRef> => this.authHttp.post<NetworkTaskRef>(`networks/${id}/members`, { json: { serverId } });

  removeMember = (id: string, serverId: string): Promise<NetworkChangeResult> =>
    this.authHttp.delete<NetworkChangeResult>(`networks/${id}/members/${serverId}`);

  setOrder = (id: string, order: string[]): Promise<NetworkChangeResult> => this.authHttp.put<NetworkChangeResult>(`networks/${id}/order`, { json: { order } });

  rotateSecret = (id: string): Promise<NetworkChangeResult> => this.authHttp.post<NetworkChangeResult>(`networks/${id}/secret/rotate`);
}

export const networksApi = new NetworksApi(authHttp);
