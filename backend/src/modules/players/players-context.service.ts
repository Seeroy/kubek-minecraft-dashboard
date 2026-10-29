import { ApiErrorCode } from "@/core/errors/error-codes";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { ServersService } from "@/modules/servers/servers.service";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  PlayerLists,
  PlayersOverview,
  PlayersSettings,
} from "@shared/types/players.types";
import { ServerStatus } from "@shared/types/server/server.types";
import type { ApplyTarget } from "./apply/player-list.applier";
import { decodeList } from "./lists/list-codec";
import { readListFileOrFail } from "./lists/list-files";
import { readPlayersSettings, supportsPlayerLists } from "./players-support";

export interface PlayersContext extends ApplyTarget {
  live: boolean;
  /** Starting or stopping, neither the console nor the files can be trusted */
  busy: boolean;
  settings: PlayersSettings;
}

/** Server state the player endpoints work against */
@Injectable()
export class PlayersContextService {
  constructor(
    private readonly servers: ServersService,
    private readonly registry: ServerTypesRegistry,
  ) {}

  async load(serverId: string): Promise<PlayersContext> {
    const server = this.servers.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const manifest = server.blueprintId
      ? this.registry.get(server.blueprintId)?.manifest
      : undefined;
    if (!supportsPlayerLists(manifest)) {
      throw new BadRequestException({
        code: ApiErrorCode.PLAYERS_UNSUPPORTED,
        message: "This server type has no player lists",
      });
    }

    const instance = this.servers.getInstance(serverId);
    const running = instance.isRunning();
    const live = running && server.status === ServerStatus.RUNNING;
    return {
      serverId,
      instance,
      live,
      busy: running && !live,
      settings: readPlayersSettings(await instance.readServerProperties()),
    };
  }

  /** Context for a change, refused while the server is starting or stopping */
  async loadWritable(serverId: string): Promise<PlayersContext> {
    const context = await this.load(serverId);
    if (context.busy) {
      throw new ConflictException({
        code: ApiErrorCode.SERVER_BUSY,
        message: "Wait until the server has started or stopped",
      });
    }
    return context;
  }

  async overview(
    context: PlayersContext,
    settings = context.settings,
  ): Promise<PlayersOverview> {
    const [whitelist, ops, bans, ipBans] = await Promise.all(
      (["whitelist", "ops", "bans", "ipBans"] as const).map(async (list) =>
        decodeList(list, await readListFileOrFail(context.serverId, list)),
      ),
    );
    const lists = { whitelist, ops, bans, ipBans } as PlayerLists;
    return { ...lists, settings, live: context.live };
  }
}
