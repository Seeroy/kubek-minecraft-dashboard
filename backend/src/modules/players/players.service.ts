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
import type { IUser } from "@shared/types/user.types";
import { isIP } from "net";
import { cleanReason, kickCommand } from "./apply/console-commands";
import { LiveApplier } from "./apply/live.applier";
import { OfflineApplier } from "./apply/offline.applier";
import type { PlayerListApplier } from "./apply/player-list.applier";
import type {
  AddBanDto,
  AddIpBanDto,
  AddOpDto,
  KickPlayerDto,
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

/** Whitelist, operators, bans and kicks of one server */
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

  async kick(serverId: string, dto: KickPlayerDto): Promise<void> {
    const context = await this.contexts.load(serverId);
    const sent =
      context.live && context.instance.input(kickCommand(dto.name, dto.reason));
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
