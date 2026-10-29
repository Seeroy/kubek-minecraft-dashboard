import {
  type NetworkMemberRecord,
  type NetworkRecord,
  NetworksRepository,
} from "@/modules/database/repositories/networks.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NetworkErrorCode } from "@shared/types/network.types";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import {
  forwardingFor,
  VELOCITY_BLUEPRINT_ID,
} from "./forwarding/forwarding-registry";
import { readSecret, serverFiles, writeEdits } from "./network-files";
import { NetworkPortsService } from "./network-ports.service";
import { generateSecret } from "./plan/network-naming";
import type {
  DraftBackend,
  DraftProxy,
  DraftServer,
  NetworkDraft,
  ServerEdits,
} from "./plan/network-draft";

const IDLE = [ServerStatus.STOPPED, ServerStatus.CRASHED];

/** Turns panel servers and network rows into drafts and writes drafts back */
@Injectable()
export class NetworkContextService {
  constructor(
    private readonly servers: ServersRepository,
    private readonly networks: NetworksRepository,
    private readonly ports: NetworkPortsService,
  ) {}

  requireServer(serverId: string): IServer {
    const server = this.servers.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");
    return server;
  }

  requireNetwork(id: string): NetworkRecord {
    const network = this.networks.findById(id);
    if (!network) {
      throw new NotFoundException({
        code: NetworkErrorCode.NOT_FOUND,
        message: "Network not found",
      });
    }
    return network;
  }

  /** The server is neither a proxy nor a member of any network */
  assertFree(serverId: string): void {
    if (this.networks.findByServer(serverId)) {
      throw new ConflictException({
        code: NetworkErrorCode.SERVER_TAKEN,
        message: "The server already belongs to a network",
      });
    }
  }

  assertProxy(server: IServer): void {
    if (server.blueprintId !== VELOCITY_BLUEPRINT_ID) {
      throw new BadRequestException({
        code: NetworkErrorCode.PROXY_INVALID,
        message: `${server.name} is not a Velocity server`,
      });
    }
  }

  forwardingOf(blueprintId: string, name: string) {
    const forwarding = forwardingFor(blueprintId);
    if (!forwarding) {
      throw new BadRequestException({
        code: NetworkErrorCode.BACKEND_UNSUPPORTED,
        message: `${name} cannot run behind Velocity`,
      });
    }
    return forwarding;
  }

  async draftServer(server: IServer): Promise<DraftServer> {
    const version = server.variables?.GAME_VERSION;
    return {
      serverId: server.id,
      name: server.name,
      blueprintId: server.blueprintId,
      gameVersion: version === undefined ? undefined : String(version),
      port: (await this.ports.gamePort(server)) ?? 0,
      running: !IDLE.includes(server.status),
    };
  }

  async draftProxy(server: IServer): Promise<DraftProxy> {
    return {
      ...(await this.draftServer(server)),
      docker: server.runtimeKind === "docker",
    };
  }

  async draftBackend(
    server: IServer,
    alias: string,
    tryOrder: number | null,
  ): Promise<DraftBackend> {
    return {
      ...(await this.draftServer(server)),
      alias,
      tryOrder,
      forwarding: this.forwardingOf(server.blueprintId, server.name),
    };
  }

  /** Current state of a stored network */
  async draftOf(
    network: NetworkRecord,
    members: NetworkMemberRecord[] = this.networks.members(network.id),
  ): Promise<NetworkDraft> {
    const backends: DraftBackend[] = [];
    for (const member of members) {
      const server = this.servers.findById(member.serverId);
      // A core change can turn a member into a type Velocity cannot serve
      if (server && forwardingFor(server.blueprintId)) {
        backends.push(
          await this.draftBackend(server, member.alias, member.tryOrder),
        );
      }
    }
    return {
      proxy: await this.draftProxy(this.requireServer(network.proxyServerId)),
      backends,
      mode: network.forwardingMode,
      // Velocity would make one on start, the backends need it before that
      secret: (await readSecret(network.proxyServerId)) || generateSecret(),
    };
  }

  filesOf = (server: DraftServer) => serverFiles(server.serverId);

  async write(edits: ServerEdits[]): Promise<void> {
    for (const { server, edits: list } of edits) {
      if (server.serverId) await writeEdits(server.serverId, list);
    }
  }
}
