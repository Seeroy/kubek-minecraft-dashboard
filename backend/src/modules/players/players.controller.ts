import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { diffChanges } from "@/modules/audit-log/audit-diff";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import {
  AddBanDto,
  AddIpBanDto,
  AddOpDto,
  GamemodeDto,
  KickPlayerDto,
  KnownPlayersQueryDto,
  PlayerNameDto,
  TeleportDto,
  UpdatePlayersSettingsDto,
} from "./dto/player-requests.dto";
import {
  KnownPlayersPageDto,
  PlayerDetailsDto,
  PlayersOverviewDto,
  ResetPlayerDataDto,
  ResolvedPlayerDto,
} from "./dto/player-responses.dto";
import { fromBody, fromParam, playersAudit } from "./players.audit";
import { PlayersService } from "./players.service";
import { PlayersDataService } from "./players-data.service";
import { PlayersSettingsService } from "./players-settings.service";

@ApiTags("Players")
@ApiBearerAuth()
@ApiParam({ name: "serverId", description: "Server ID" })
@Controller("api/servers/:serverId/players")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
@CheckServerAccess("serverId")
export class PlayersController {
  constructor(
    private readonly players: PlayersService,
    private readonly settings: PlayersSettingsService,
    private readonly data: PlayersDataService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Whitelist, operators, bans and their toggles" })
  @RequireAccess(AccessArea.PLAYERS, "read")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404])
  overview(@Param("serverId") serverId: string): Promise<PlayersOverviewDto> {
    return this.players.overview(serverId);
  }

  @Get("resolve")
  @ApiOperation({ summary: "Check a name and get the UUID the server uses" })
  @RequireAccess(AccessArea.PLAYERS, "read")
  @ApiOkResponse({ type: ResolvedPlayerDto })
  @ApiErrorResponses([400, 401, 403, 404, 503])
  resolve(
    @Param("serverId") serverId: string,
    @Query() query: PlayerNameDto,
  ): Promise<ResolvedPlayerDto> {
    return this.players.resolve(serverId, query.name);
  }

  @Get("known")
  @ApiOperation({
    summary: "Players the server has seen, newest save first, one page",
  })
  @RequireAccess(AccessArea.PLAYERS, "read")
  @ApiOkResponse({ type: KnownPlayersPageDto })
  @ApiErrorResponses([400, 401, 403, 404])
  known(
    @Param("serverId") serverId: string,
    @Query() query: KnownPlayersQueryDto,
  ): Promise<KnownPlayersPageDto> {
    return this.data.list(serverId, query);
  }

  @Get("known/:id")
  @ApiOperation({
    summary: "Saved position, vitals and stats of a player by UUID or name",
  })
  @RequireAccess(AccessArea.PLAYERS, "read")
  @ApiOkResponse({ type: PlayerDetailsDto })
  @ApiErrorResponses([400, 401, 403, 404])
  details(
    @Param("serverId") serverId: string,
    @Param("id") id: string,
  ): Promise<PlayerDetailsDto> {
    return this.data.details(serverId, id);
  }

  @Delete("known/:uuid")
  @ApiOperation({
    summary: "Reset a player's progress, stats and advancements",
  })
  @RequireAccess(AccessArea.PLAYERS, "manage")
  @ApiOkResponse({ type: ResetPlayerDataDto })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @Audit(playersAudit(AuditAction.PLAYERS_RESET_DATA, fromParam.uuid))
  resetData(
    @Param("serverId") serverId: string,
    @Param("uuid") uuid: string,
  ): Promise<ResetPlayerDataDto> {
    return this.data.reset(serverId, uuid);
  }

  @Put("settings")
  @ApiOperation({ summary: "Toggle white-list and enforce-whitelist" })
  @RequireAccess(AccessArea.PLAYERS, "manage")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @Audit(playersAudit(AuditAction.PLAYERS_SETTINGS_UPDATE, () => undefined))
  async updateSettings(
    @Param("serverId") serverId: string,
    @Body() dto: UpdatePlayersSettingsDto,
    @Req() req: Request,
  ): Promise<PlayersOverviewDto> {
    const before = (await this.players.overview(serverId)).settings;
    const after = await this.settings.update(serverId, dto);
    auditNote(req, { changes: diffChanges(before, after.settings) });
    return after;
  }

  @Post("whitelist")
  @ApiOperation({ summary: "Add a player to the whitelist" })
  @RequireAccess(AccessArea.PLAYERS, "write")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 503, 504])
  @Audit(playersAudit(AuditAction.PLAYERS_WHITELIST_ADD, fromBody.name))
  addToWhitelist(
    @Param("serverId") serverId: string,
    @Body() dto: PlayerNameDto,
  ): Promise<PlayersOverviewDto> {
    return this.players.addToWhitelist(serverId, dto.name);
  }

  @Delete("whitelist/:name")
  @ApiOperation({ summary: "Remove a player from the whitelist" })
  @RequireAccess(AccessArea.PLAYERS, "write")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 504])
  @Audit(playersAudit(AuditAction.PLAYERS_WHITELIST_REMOVE, fromParam.name))
  removeFromWhitelist(
    @Param("serverId") serverId: string,
    @Param("name") name: string,
  ): Promise<PlayersOverviewDto> {
    return this.players.remove(serverId, "whitelist", name);
  }

  @Post("ops")
  @ApiOperation({ summary: "Make a player an operator" })
  @RequireAccess(AccessArea.PLAYERS, "manage")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 503, 504])
  @Audit(
    playersAudit(AuditAction.PLAYERS_OP, fromBody.name, (req) => ({
      level: (req.body as AddOpDto).level,
    })),
  )
  addOp(
    @Param("serverId") serverId: string,
    @Body() dto: AddOpDto,
  ): Promise<PlayersOverviewDto> {
    return this.players.addOp(serverId, dto);
  }

  @Delete("ops/:name")
  @ApiOperation({ summary: "Take operator rights away" })
  @RequireAccess(AccessArea.PLAYERS, "manage")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 504])
  @Audit(playersAudit(AuditAction.PLAYERS_DEOP, fromParam.name))
  removeOp(
    @Param("serverId") serverId: string,
    @Param("name") name: string,
  ): Promise<PlayersOverviewDto> {
    return this.players.remove(serverId, "ops", name);
  }

  @Post("bans")
  @ApiOperation({ summary: "Ban a player" })
  @RequireAccess(AccessArea.PLAYERS, "manage")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 503, 504])
  @Audit(
    playersAudit(AuditAction.PLAYERS_BAN, fromBody.name, (req) => ({
      reason: (req.body as AddBanDto).reason,
      expiresAt: (req.body as AddBanDto).expiresAt,
    })),
  )
  addBan(
    @Param("serverId") serverId: string,
    @Body() dto: AddBanDto,
    @CurrentUser() user: IUser,
  ): Promise<PlayersOverviewDto> {
    return this.players.addBan(serverId, dto, user);
  }

  @Delete("bans/:name")
  @ApiOperation({ summary: "Lift a player ban" })
  @RequireAccess(AccessArea.PLAYERS, "manage")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 504])
  @Audit(playersAudit(AuditAction.PLAYERS_PARDON, fromParam.name))
  removeBan(
    @Param("serverId") serverId: string,
    @Param("name") name: string,
  ): Promise<PlayersOverviewDto> {
    return this.players.remove(serverId, "bans", name);
  }

  @Post("ip-bans")
  @ApiOperation({ summary: "Ban an IP address" })
  @RequireAccess(AccessArea.PLAYERS, "manage")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 504])
  @Audit(
    playersAudit(AuditAction.PLAYERS_BAN_IP, fromBody.ip, (req) => ({
      reason: (req.body as AddIpBanDto).reason,
      expiresAt: (req.body as AddIpBanDto).expiresAt,
    })),
  )
  addIpBan(
    @Param("serverId") serverId: string,
    @Body() dto: AddIpBanDto,
    @CurrentUser() user: IUser,
  ): Promise<PlayersOverviewDto> {
    return this.players.addIpBan(serverId, dto, user);
  }

  @Delete("ip-bans/:ip")
  @ApiOperation({ summary: "Lift an IP ban" })
  @RequireAccess(AccessArea.PLAYERS, "manage")
  @ApiOkResponse({ type: PlayersOverviewDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 504])
  @Audit(playersAudit(AuditAction.PLAYERS_PARDON_IP, fromParam.ip))
  removeIpBan(
    @Param("serverId") serverId: string,
    @Param("ip") ip: string,
  ): Promise<PlayersOverviewDto> {
    return this.players.removeIpBan(serverId, ip);
  }

  @Post("kick")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Kick an online player" })
  @RequireAccess(AccessArea.PLAYERS, "write")
  @ApiNoContentResponse({ description: "Kick command sent" })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @Audit(
    playersAudit(AuditAction.PLAYERS_KICK, fromBody.name, (req) => ({
      reason: (req.body as KickPlayerDto).reason,
    })),
  )
  kick(
    @Param("serverId") serverId: string,
    @Body() dto: KickPlayerDto,
  ): Promise<void> {
    return this.players.kick(serverId, dto);
  }

  @Post("gamemode")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change the game mode of an online player" })
  @RequireAccess(AccessArea.PLAYERS, "write")
  @ApiNoContentResponse({ description: "Command sent" })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @Audit(
    playersAudit(AuditAction.PLAYERS_GAMEMODE, fromBody.name, (req) => ({
      gamemode: (req.body as GamemodeDto).gamemode,
    })),
  )
  gamemode(
    @Param("serverId") serverId: string,
    @Body() dto: GamemodeDto,
  ): Promise<void> {
    return this.players.setGamemode(serverId, dto);
  }

  @Post("teleport")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Teleport an online player" })
  @RequireAccess(AccessArea.PLAYERS, "write")
  @ApiNoContentResponse({ description: "Command sent" })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @Audit(
    playersAudit(AuditAction.PLAYERS_TELEPORT, fromBody.name, (req) => {
      const { x, y, z, dimension } = req.body as TeleportDto;
      return { x, y, z, dimension };
    }),
  )
  teleport(
    @Param("serverId") serverId: string,
    @Body() dto: TeleportDto,
  ): Promise<void> {
    return this.players.teleport(serverId, dto);
  }

  @Post("heal")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Restore the health of an online player" })
  @RequireAccess(AccessArea.PLAYERS, "write")
  @ApiNoContentResponse({ description: "Command sent" })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @Audit(playersAudit(AuditAction.PLAYERS_HEAL, fromBody.name))
  heal(
    @Param("serverId") serverId: string,
    @Body() dto: PlayerNameDto,
  ): Promise<void> {
    return this.players.heal(serverId, dto.name);
  }

  @Post("feed")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Fill the hunger bar of an online player" })
  @RequireAccess(AccessArea.PLAYERS, "write")
  @ApiNoContentResponse({ description: "Command sent" })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @Audit(playersAudit(AuditAction.PLAYERS_FEED, fromBody.name))
  feed(
    @Param("serverId") serverId: string,
    @Body() dto: PlayerNameDto,
  ): Promise<void> {
    return this.players.feed(serverId, dto.name);
  }
}
