import { canAccessServer } from "@/core/utils/serverAccess";
import {
  type NetworkRecord,
  NetworksRepository,
} from "@/modules/database/repositories/networks.repository";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  type NetworkChangeResult,
  NetworkErrorCode,
} from "@shared/types/network.types";
import { type ITask, TaskType } from "@shared/types/task.types";
import type { IUser } from "@shared/types/user.types";
import { FabricProxyInstaller } from "./forwarding/fabric-proxy-installer.service";
import { NetworkContextService } from "./network-context.service";
import { NetworksService } from "./networks.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  type DraftBackend,
  draftEdits,
  type NetworkDraft,
  needsRestart,
} from "./plan/network-draft";
import { aliasFor, generateSecret } from "./plan/network-naming";

/** Changes to an existing network, each one rewrites the files it affects */
@Injectable()
export class NetworkMembersService {
  constructor(
    private readonly networks: NetworksRepository,
    private readonly read: NetworksService,
    private readonly context: NetworkContextService,
    private readonly fabricProxy: FabricProxyInstaller,
    private readonly tasks: TasksService,
  ) {}

  addMember(id: string, serverId: string, user: IUser): ITask {
    const network = this.read.requireManaged(id, user);
    if (!canAccessServer(user, serverId)) {
      throw new ForbiddenException(`Access to server ${serverId} denied`);
    }
    const server = this.context.requireServer(serverId);
    this.context.assertFree(serverId);
    const forwarding = this.context.forwardingOf(
      server.blueprintId,
      server.name,
    );
    const version = server.variables?.GAME_VERSION;
    const gameVersion = version === undefined ? undefined : String(version);
    if (!forwarding.modes(gameVersion).includes(network.forwardingMode)) {
      throw new BadRequestException({
        code: NetworkErrorCode.MODE_CONFLICT,
        message: `${server.name} cannot use ${network.forwardingMode} forwarding`,
      });
    }

    return this.tasks.runTask(
      TaskType.NETWORK_UPDATE,
      user.id,
      async () => {
        if (forwarding.kind === "fabric") {
          await this.fabricProxy.ensure(server, gameVersion, user.id);
        }
        const draft = await this.context.draftOf(network);
        const taken = draft.backends.map((b) => b.alias);
        const first = draft.backends.every((b) => b.tryOrder === null);
        const backend = await this.context.draftBackend(
          server,
          aliasFor(server.name, taken),
          first ? 0 : null,
        );
        draft.backends.push(backend);
        return this.commit(network, draft, [backend]);
      },
      { serverId: server.id, serverName: server.name },
    );
  }

  async removeMember(
    id: string,
    serverId: string,
    user: IUser,
  ): Promise<NetworkChangeResult> {
    const network = this.read.requireManaged(id, user);
    const members = this.networks
      .members(id)
      .filter((m) => m.serverId !== serverId);
    const draft = await this.context.draftOf(network, members);
    this.compactOrder(draft.backends);
    return this.commit(network, draft, []);
  }

  /** Server ids in try order, the first is the default server */
  async setOrder(
    id: string,
    order: string[],
    user: IUser,
  ): Promise<NetworkChangeResult> {
    const network = this.read.requireManaged(id, user);
    const draft = await this.context.draftOf(network);
    const known = new Set(draft.backends.map((b) => b.serverId));
    if (
      !order.length ||
      new Set(order).size !== order.length ||
      order.some((s) => !known.has(s))
    ) {
      throw new BadRequestException({
        code: NetworkErrorCode.ORDER_INVALID,
        message: "Try order must list members of the network",
      });
    }
    for (const backend of draft.backends) {
      const index = order.indexOf(backend.serverId!);
      backend.tryOrder = index < 0 ? null : index;
    }
    return this.commit(network, draft, []);
  }

  async rotateSecret(id: string, user: IUser): Promise<NetworkChangeResult> {
    const network = this.read.requireManaged(id, user);
    if (network.forwardingMode !== "modern") {
      throw new BadRequestException("Legacy forwarding has no secret");
    }
    const draft = {
      ...(await this.context.draftOf(network)),
      secret: generateSecret(),
    };
    return this.commit(network, draft, draft.backends);
  }

  private compactOrder(backends: DraftBackend[]): void {
    backends
      .filter((b) => b.tryOrder !== null)
      .sort((a, b) => a.tryOrder! - b.tryOrder!)
      .forEach((b, index) => (b.tryOrder = index));
    if (backends.length && backends.every((b) => b.tryOrder === null)) {
      backends[0].tryOrder = 0;
    }
  }

  private async commit(
    network: NetworkRecord,
    draft: NetworkDraft,
    configure: DraftBackend[],
  ): Promise<NetworkChangeResult> {
    const edits = await draftEdits(draft, configure, this.context.filesOf);
    await this.context.write(edits);
    this.networks.setMembers(
      network.id,
      draft.backends.map((b) => ({
        serverId: b.serverId!,
        alias: b.alias,
        tryOrder: b.tryOrder,
      })),
    );
    return { networkId: network.id, restart: needsRestart(edits) };
  }
}
