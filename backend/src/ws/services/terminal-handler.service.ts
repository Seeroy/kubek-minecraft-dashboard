import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { Injectable } from "@nestjs/common";
import { IUser, UserPermissions } from "@shared/types/user.types";

/** Result of a server-side completion request, mirrored from the instance */
export interface CompletionResponse {
  completion: string;
  candidates: string[];
}

/**
 * Bridges the console completion WS event to the running instance (for terminal emul)
 */
@Injectable()
export class TerminalHandlerService {
  constructor(private readonly instancesRegistry: InstancesRegistry) {}

  /** Complete a console line */
  async complete(
    user: IUser | undefined,
    serverId: string,
    line: string,
  ): Promise<CompletionResponse> {
    const empty: CompletionResponse = {
      completion: line ?? "",
      candidates: [],
    };
    if (!user || typeof line !== "string") return empty;
    if (!this.canManageServer(user, serverId)) return empty;

    const instance = this.instancesRegistry.getByServerId(serverId);
    if (!instance || !instance.isRunning()) return empty;
    return instance.complete(line);
  }

  private hasServerAccess(user: IUser, serverId: string): boolean {
    if (!user.serversRestrict?.enabled) return true;
    return (user.serversRestrict.allowed ?? []).includes(serverId);
  }

  private canManageServer(user: IUser, serverId: string): boolean {
    const allowed =
      user.isAdmin ||
      user.permissions?.includes(UserPermissions.SERVERS_CONTROL);
    return Boolean(allowed) && this.hasServerAccess(user, serverId);
  }
}
