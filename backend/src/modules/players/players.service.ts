import { ApiErrorCode } from "@/core/errors/error-codes";
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import type {
  PlayersOverview,
  ResolvedPlayer,
} from "@shared/types/players.types";
import { usesLegacyCommands } from "@shared/players/game-version";
import type { IUser } from "@shared/types/user.types";
import { isIP } from "net";
import {
  cleanReason,
  feedCommand,
  gamemodeCommand,
  healCommand,
  kickCommand,
  LegacyCommandError,
  teleportCommand,
} from "./apply/console-commands";
import { LiveApplier } from "./apply/live.applier";
import { OfflineApplier } from "./apply/offline.applier";
import type { PlayerListApplier } from "./apply/player-list.applier";
import type {
  AddBanDto,
  AddIpBanDto,
  AddOpDto,
  GamemodeDto,
  KickPlayerDto,
  TeleportDto,
} from "./dto/player-requests.dto";
import type { ListChange } from "./lists/list-codec";
import { PLAYER_NAME } from "./players.constants";
import {
  type PlayersContext,
  PlayersContextService,
} from "./players-context.service";
import { PlayerProfileService } from "./profiles/profile.service";

type NamedList = "whitelist" | "ops" | "bans";

const needsStoppedServer = (what: string) =>
  new ConflictException({
    code: ApiErrorCode.PLAYERS_NEEDS_STOPPED_SERVER,
    message: `${what} can only be set while the server is stopped`,
  });

/** Whitelist, operators, bans and console actions on players of one server */
@Injectable()
export class PlayersService {
  private readonly appliers: Record<"live" | "offline", PlayerListApplier>;

  constructor(
    private readonly contexts: PlayersContextService,
    private readonly profiles: PlayerProfileService,
    live: LiveApplier,
    offline: OfflineApplier,
  ) {
    this.appliers = { live, offline };
  }

  async overview(serverId: string): Promise<PlayersOverview> {
    return this.contexts.overview(await this.contexts.load(serverId));
  }

  async resolve(serverId: string, name: string): Promise<ResolvedPlayer> {
    const context = await this.contexts.load(serverId);
    return this.profiles.resolve(serverId, name, context.settings.onlineMode);
  }

  addToWhitelist(serverId: string, name: string) {
    return this.change(serverId, async (context) => ({
      list: "whitelist",
      action: "add",
      player: await this.player(context, name),
    }));
  }

  addOp(serverId: string, dto: AddOpDto) {
    return this.change(serverId, async (context) => {
      const level = dto.level ?? context.settings.opPermissionLevel;
      const bypassesPlayerLimit = dto.bypassesPlayerLimit ?? false;
      // The op command always grants the default level
      if (
        context.live &&
        (level !== context.settings.opPermissionLevel || bypassesPlayerLimit)
      ) {
        throw needsStoppedServer("Operator level");
      }
      return {
        list: "ops",
        action: "add",
        player: await this.player(context, dto.name),
        level,
        bypassesPlayerLimit,
      };
    });
  }

  addBan(serverId: string, dto: AddBanDto, actor: IUser) {
    return this.change(serverId, async (context) => {
      if (context.live && dto.expiresAt !== undefined) {
        throw needsStoppedServer("Ban expiry");
      }
      return {
        list: "bans",
        action: "add",
        player: await this.player(context, dto.name),
        reason: cleanReason(dto.reason),
        source: actor.username,
        expiresAt: dto.expiresAt ?? null,
      };
    });
  }

  addIpBan(serverId: string, dto: AddIpBanDto, actor: IUser) {
    return this.change(serverId, (context) => {
      if (context.live && dto.expiresAt !== undefined) {
        throw needsStoppedServer("Ban expiry");
      }
      return {
        list: "ipBans",
        action: "add",
        ip: dto.ip,
        reason: cleanReason(dto.reason),
        source: actor.username,
        expiresAt: dto.expiresAt ?? null,
      };
    });
  }

  remove(serverId: string, list: NamedList, name: string) {
    if (!PLAYER_NAME.test(name)) {
      throw new BadRequestException("Invalid player name");
    }
    return this.change(serverId, () => ({ list, action: "remove", name }));
  }

  removeIpBan(serverId: string, ip: string) {
    if (!isIP(ip)) throw new BadRequestException("Invalid IP address");
    return this.change(serverId, () => ({
      list: "ipBans",
      action: "remove",
      ip,
    }));
  }

  kick(serverId: string, dto: KickPlayerDto): Promise<void> {
    return this.send(serverId, () => kickCommand(dto.name, dto.reason));
  }

  setGamemode(serverId: string, dto: GamemodeDto): Promise<void> {
    return this.send(serverId, () => gamemodeCommand(dto.name, dto.gamemode));
  }

  teleport(serverId: string, dto: TeleportDto): Promise<void> {
    return this.send(serverId, (legacy) =>
      teleportCommand(dto.name, dto, legacy),
    );
  }

  heal(serverId: string, name: string): Promise<void> {
    return this.send(serverId, (legacy) => healCommand(name, legacy));
  }

  feed(serverId: string, name: string): Promise<void> {
    return this.send(serverId, (legacy) => feedCommand(name, legacy));
  }

  // Can't confirm these, the server only answers in the console
  private async send(
    serverId: string,
    build: (legacy: boolean) => string,
  ): Promise<void> {
    const context = await this.contexts.load(serverId);
    let command: string;
    try {
      command = build(
        usesLegacyCommands(context.instance.runtime?.gameVersion),
      );
    } catch (error) {
      if (!(error instanceof LegacyCommandError)) throw error;
      throw new BadRequestException({
        code: ApiErrorCode.PLAYERS_NEEDS_NEWER_VERSION,
        message: "This server version can't do that",
      });
    }
    const sent = context.live && context.instance.input(command);
    if (!sent) {
      throw new ConflictException({
        code: ApiErrorCode.SERVER_NOT_RUNNING,
        message: "Server is not running",
      });
    }
  }

  private async change(
    serverId: string,
    build: (context: PlayersContext) => ListChange | Promise<ListChange>,
  ): Promise<PlayersOverview> {
    const context = await this.contexts.loadWritable(serverId);
    const change = await build(context);
    await this.appliers[context.live ? "live" : "offline"].apply(
      context,
      change,
    );
    return this.contexts.overview(context);
  }

  private player(context: PlayersContext, name: string) {
    return this.profiles
      .resolve(context.serverId, name, context.settings.onlineMode)
      .then(({ name, uuid }) => ({ name, uuid }));
  }
}
