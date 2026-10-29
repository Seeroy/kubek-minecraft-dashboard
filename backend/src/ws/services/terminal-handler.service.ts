import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { Injectable } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { canOnServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";

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

  private canManageServer(user: IUser, serverId: string): boolean {
    return canOnServer(user, AccessArea.CONSOLE, "write", serverId);
  }
}
