import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { extractClientIp } from "@/core/utils/request";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import { AccessArea } from "@shared/access/areas";
import {
  AuditAction,
  AuditCategory,
  AuditResult,
} from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { Request, Response } from "express";
import { LinkTelegramDto } from "./dto/link-telegram.dto";
import { OtpValidationDto } from "./dto/otp-validation.dto";
import {
  BotInfoResponseDto,
  GenerateOtpResponseDto,
  LinkedUserResponseDto,
} from "./dto/telegram-responses.dto";
import { BotLinkingService, type PanelActor } from "./bot-linking.service";
import { TelegramBotService } from "./telegram-bot.service";

function panelActor(user: IUser, req: Request): PanelActor {
  return {
    userId: user.id,
    username: user.username,
    ip: extractClientIp(req),
    userAgent: req.headers["user-agent"] ?? null,
  };
}

@ApiTags("Telegram Bot")
@Controller("api/telegram-bot")
export class TelegramBotController {
  constructor(
    private readonly telegramBotService: TelegramBotService,
    private readonly linking: BotLinkingService,
    private readonly broadcast: ServerBroadcastService,
    private readonly audit: AuditLogService,
  ) {}

  @Post("generate-otp")
  @UseGuards(BearerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate OTP for Telegram linking" })
  @ApiOkResponse({
    type: GenerateOtpResponseDto,
    description: "OTP generated successfully",
  })
  @ApiErrorResponses()
  generateOtp(
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): GenerateOtpResponseDto {
    const { otp, otpId, expiresAt } = this.linking.generateOtp(user.id);
    // The code itself never goes into the log
    const actor = panelActor(user, req);
    this.audit.record({
      action: AuditAction.TELEGRAM_OTP_GENERATE,
      category: AuditCategory.TELEGRAM,
      resourceType: "otp",
      resourceId: otpId,
      userId: actor.userId,
      username: actor.username,
      details: { otpId, expiresAt },
      result: AuditResult.SUCCESS,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    this.broadcast.emitOtpUpdate(user.id, {
      code: otp,
      expiresAt,
    });

    return { otp };
  }

  @Post("link-telegram")
  @UseGuards(BearerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Validate OTP and link Telegram account" })
  @ApiOkResponse({
    type: OtpValidationDto,
    description: "Telegram account linked successfully",
  })
  @ApiErrorResponses()
  linkTelegram(
    @CurrentUser() user: IUser,
    @Body() dto: LinkTelegramDto,
  ): OtpValidationDto {
    // A lockout surfaces as 429 instead of a plain invalid answer
    const isValid = this.linking.validateOtp(user.id, dto.otp);
    return isValid
      ? { valid: true }
      : { valid: false, error: "Invalid or expired OTP code" };
  }

  @Get("info")
  @UseGuards(BearerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get bot information" })
  @ApiOkResponse({
    type: BotInfoResponseDto,
    description: "Bot information retrieved successfully",
  })
  @ApiErrorResponses()
  async getBotInfo(): Promise<BotInfoResponseDto> {
    try {
      return await this.telegramBotService.getBotInfo();
    } catch {
      return { name: "", username: "", error: "Failed to get bot information" };
    }
  }

  @Get("avatar")
  @UseGuards(BearerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the bot profile photo" })
  @ApiProduces("image/jpeg")
  @ApiOkResponse({ description: "Bot avatar image" })
  @ApiErrorResponses([401, 404])
  async getBotAvatar(@Res() res: Response): Promise<void> {
    const avatar = await this.telegramBotService.getBotAvatar();
    if (!avatar) throw new NotFoundException("Bot has no avatar");
    res.setHeader("Content-Type", avatar.mime);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(avatar.data);
  }

  @Get("linked-users")
  @UseGuards(BearerAuthGuard, AccessGuard)
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get list of linked Telegram users" })
  @ApiOkResponse({
    type: [LinkedUserResponseDto],
    description: "Linked users retrieved successfully",
  })
  @ApiErrorResponses()
  getLinkedUsers(): LinkedUserResponseDto[] {
    return this.linking.getLinkedUsers();
  }

  @Post("unlink-user")
  @HttpCode(204)
  @UseGuards(BearerAuthGuard, AccessGuard)
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Unlink a Telegram user" })
  @ApiNoContentResponse({ description: "User unlinked successfully" })
  @ApiErrorResponses()
  unlinkUser(
    @CurrentUser() user: IUser,
    @Body() body: { telegramId: number },
    @Req() req: Request,
  ): void {
    this.linking.unlinkUser(panelActor(user, req), body.telegramId);
  }
}
