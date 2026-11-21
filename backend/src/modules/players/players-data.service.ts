import { ApiErrorCode } from "@/core/errors/error-codes";
import { CompanionHubService } from "@/modules/companion/companion-hub.service";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  KnownPlayer,
  KnownPlayersPage,
  PlayerDetails,
} from "@shared/types/players.types";
import { readNbt } from "./data/nbt";
import {
  readPlayerNbt,
  readPlayerStats,
  readUserCache,
  UUID,
} from "./data/player-data";
import {
  deletePlayerFiles,
  listPlayerData,
  readPlayerFile,
  readServerJson,
  worldFolder,
} from "./data/player-files";
import { PLAYER_NAME } from "./players.constants";
import {
  type PlayersContext,
  PlayersContextService,
} from "./players-context.service";

export interface KnownPlayersQuery {
  page: number;
  pageSize: number;
  search?: string;
}

const EMPTY_SAVE: ReturnType<typeof readPlayerNbt> = {
  gamemode: null,
  health: null,
  food: null,
  xpLevel: null,
  position: null,
  lastDeath: null,
};

// Based on the Players extension by limeskat, github.com/limeskat/kubek-extension-players
@Injectable()
export class PlayersDataService {
  constructor(
    private readonly contexts: PlayersContextService,
    private readonly companion: CompanionHubService,
  ) {}

  async list(
    serverId: string,
    { page, pageSize, search }: KnownPlayersQuery,
  ): Promise<KnownPlayersPage> {
    const context = await this.contexts.load(serverId);
    const [names, saved] = await Promise.all([
      this.names(serverId),
      listPlayerData(serverId, await this.world(context)),
    ]);

    const needle = search?.trim().toLowerCase();
    const all: KnownPlayer[] = [...new Set([...names.keys(), ...saved.keys()])]
      .map((uuid) => ({
        uuid,
        name: names.get(uuid) ?? null,
        savedAt: saved.get(uuid) ?? null,
      }))
      .filter(
        (player) =>
          !needle ||
          player.uuid.includes(needle) ||
          !!player.name?.toLowerCase().includes(needle),
      )
      .sort(
        (a, b) =>
          (b.savedAt ?? 0) - (a.savedAt ?? 0) ||
          (a.name ?? a.uuid).localeCompare(b.name ?? b.uuid),
      );
    const start = page * pageSize;
    return { items: all.slice(start, start + pageSize), total: all.length };
  }

  /** By uuid, or by name for online players the status query only knows by name */
  async details(serverId: string, id: string): Promise<PlayerDetails> {
    const context = await this.contexts.load(serverId);
    const names = await this.names(serverId);
    const uuid = this.lookup(id, names);
    const world = await this.world(context);
    const [data, stats] = await Promise.all([
      readPlayerFile(serverId, world, "data", uuid),
      readPlayerFile(serverId, world, "stats", uuid),
    ]);

    let save = EMPTY_SAVE;
    if (data) {
      try {
        save = readPlayerNbt(readNbt(data.data));
      } catch {
        // Half written file, show the rest
      }
    }

    let statsJson: unknown = null;
    try {
      statsJson = stats ? JSON.parse(stats.data.toString("utf8")) : null;
    } catch {
      statsJson = null;
    }

    return {
      uuid,
      name: names.get(uuid) ?? null,
      savedAt: data ? Math.round(data.mtimeMs) : null,
      ...save,
      stats: readPlayerStats(statsJson),
    };
  }

  /** Progress, stats and advancements go, lists and the usercache entry stay */
  async reset(serverId: string, rawUuid: string): Promise<{ deleted: number }> {
    const uuid = this.uuid(rawUuid);
    const context = await this.contexts.loadWritable(serverId);
    // The server writes the file back from memory on logout
    if (context.live && (await this.mightBeOnline(context, uuid))) {
      throw new ConflictException({
        code: ApiErrorCode.PLAYERS_PLAYER_ONLINE,
        message:
          "The player may be online, wait until they leave or stop the server",
      });
    }
    return {
      deleted: await deletePlayerFiles(
        serverId,
        await this.world(context),
        uuid,
      ),
    };
  }

  private async mightBeOnline(context: PlayersContext, uuid: string) {
    // The plugin sends the whole list, the status query only a sample
    const live = this.companion.state(context.serverId);
    if (live.connected && live.stats) {
      return live.stats.players.some((player) => player.uuid === uuid);
    }
    const name = (await this.names(context.serverId)).get(uuid) ?? null;
    return mightBeOnline(context.instance.runtime, name);
  }

  private lookup(id: string, names: Map<string, string>): string {
    if (UUID.test(id)) return id.toLowerCase();
    if (!PLAYER_NAME.test(id)) {
      throw new BadRequestException("Invalid UUID or player name");
    }
    const lower = id.toLowerCase();
    for (const [uuid, name] of names) {
      if (name.toLowerCase() === lower) return uuid;
    }
    throw new NotFoundException({
      code: ApiErrorCode.PLAYER_NOT_FOUND,
      message: "The server has not seen this player",
    });
  }

  private uuid(raw: string): string {
    if (!UUID.test(raw)) throw new BadRequestException("Invalid UUID");
    return raw.toLowerCase();
  }

  private async world(context: PlayersContext): Promise<string> {
    return worldFolder(await context.instance.readServerProperties());
  }

  private async names(serverId: string): Promise<Map<string, string>> {
    const cache = readUserCache(
      await readServerJson(serverId, "usercache.json"),
    );
    return new Map(cache.map((entry) => [entry.uuid, entry.name]));
  }
}

/** True unless the status query rules the player out */
export function mightBeOnline(
  runtime: { playersOnline?: number; playersList?: string[] } | undefined,
  name: string | null,
): boolean {
  const list = runtime?.playersList ?? [];
  const online = runtime?.playersOnline ?? list.length;
  if (online === 0) return false;
  if (name && list.some((entry) => entry.toLowerCase() === name.toLowerCase()))
    return true;
  // The query sample can be cut short or hidden, then nobody is ruled out
  return !name || list.length < online;
}
