import { secretHint } from "@/core/utils/secrets";
import { accessibleServers, canAccessServer } from "@/core/utils/serverAccess";
import {
  type NetworkRecord,
  NetworksRepository,
} from "@/modules/database/repositories/networks.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ForbiddenException, Injectable } from "@nestjs/common";
import type {
  Network,
  NetworkCandidates,
  NetworkProxyCandidate,
  NetworkServerRef,
} from "@shared/types/network.types";
import type { IServer } from "@shared/types/server/server.types";
import type { IUser } from "@shared/types/user.types";
import {
  creatableBackends,
  forwardingFor,
  VELOCITY_BLUEPRINT_ID,
} from "./forwarding/forwarding-registry";
import { VELOCITY_CONFIG } from "./config/velocity-configurator";
import {
  readVelocitySettings,
  VELOCITY_DEFAULTS,
} from "./config/velocity-settings";
import { NetworkContextService } from "./network-context.service";
import { readSecret, serverFiles } from "./network-files";
import { backendAddress } from "./plan/network-draft";

function ref(server: IServer): NetworkServerRef {
  return {
    serverId: server.id,
    name: server.name,
    blueprintId: server.blueprintId,
    status: server.status,
  };
}

/** Read side of networks */
@Injectable()
export class NetworksService {
  constructor(
    private readonly networks: NetworksRepository,
    private readonly servers: ServersRepository,
    private readonly context: NetworkContextService,
  ) {}

  async list(user: IUser): Promise<Network[]> {
    const visible = this.networks
      .findAll()
      .filter((network) => canAccessServer(user, network.proxyServerId));
    return Promise.all(visible.map((network) => this.view(network)));
  }

  async get(id: string, user: IUser): Promise<Network> {
    const network = this.context.requireNetwork(id);
    this.assertAccess(user, network);
    return this.view(network);
  }

  /** Network record the user may manage, every member included */
  requireManaged(id: string, user: IUser): NetworkRecord {
    const network = this.context.requireNetwork(id);
    this.assertAccess(user, network);
    for (const member of this.networks.members(id)) {
      if (!canAccessServer(user, member.serverId)) {
        throw new ForbiddenException(
          `Access to server ${member.serverId} denied`,
        );
      }
    }
    return network;
  }

  async candidates(user: IUser): Promise<NetworkCandidates> {
    const free = accessibleServers(user, this.servers.findAll()).filter(
      (server) => !this.networks.findByServer(server.id),
    );
    const proxies = free.filter(
      (server) => server.blueprintId === VELOCITY_BLUEPRINT_ID,
    );
    return {
      proxies: await Promise.all(proxies.map((s) => this.proxyCandidate(s))),
      backends: free.flatMap((server) => {
        const forwarding = forwardingFor(server.blueprintId);
        if (!forwarding) return [];
        const version = server.variables?.GAME_VERSION;
        return [
          {
            ...ref(server),
            kind: forwarding.kind,
            modes: forwarding.modes(version ? String(version) : undefined),
          },
        ];
      }),
      creatable: creatableBackends(),
      velocityDefaults: VELOCITY_DEFAULTS,
    };
  }

  private async proxyCandidate(
    server: IServer,
  ): Promise<NetworkProxyCandidate> {
    const text = await serverFiles(server.id).read(VELOCITY_CONFIG);
    return {
      ...ref(server),
      settings: text ? readVelocitySettings(text) : VELOCITY_DEFAULTS,
    };
  }

  delete(id: string, user: IUser): NetworkRecord {
    const network = this.requireManaged(id, user);
    this.networks.delete(id);
    return network;
  }

  private assertAccess(user: IUser, network: NetworkRecord): void {
    if (!canAccessServer(user, network.proxyServerId)) {
      throw new ForbiddenException("Access to this network denied");
    }
  }

  private async view(network: NetworkRecord): Promise<Network> {
    const draft = await this.context.draftOf(network);
    const proxy = this.context.requireServer(network.proxyServerId);
    return {
      id: network.id,
      name: network.name,
      forwardingMode: network.forwardingMode,
      createdAt: network.createdAt,
      proxy: ref(proxy),
      members: draft.backends.map((backend) => {
        const server = this.servers.findById(backend.serverId!)!;
        return {
          ...ref(server),
          alias: backend.alias,
          tryOrder: backend.tryOrder,
          address: backendAddress(draft.proxy, backend),
        };
      }),
      secret: secretHint(await readSecret(network.proxyServerId)),
    };
  }
}
