import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { toPublicUser } from "@/core/utils/publicUser";
import { extractClientIp } from "@/core/utils/request";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { ipKey } from "@/modules/rate-limit/ip-key";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import { CurrentUser } from "../decorators/current-user.decorator";
import { Public } from "../decorators/public.decorator";
import { BearerAuthGuard } from "../guards/bearer.guard";
import { AccessGuard } from "../guards/access.guard";
import { ConfirmTotpDto } from "./dto/confirm-totp.dto";
import { DisableTotpDto } from "./dto/disable-totp.dto";
import { SwitchChallengeDto } from "./dto/switch-challenge.dto";
import {
  BeginTotpResponseDto,
  PollChallengeResponseDto,
  SwitchChallengeResponseDto,
  TwofaStatusResponseDto,
  VerifyTotpResponseDto,
} from "./dto/twofa-responses.dto";
import { VerifyTotpDto } from "./dto/verify-totp.dto";
import { TwofaService } from "./twofa.service";

@ApiTags("Auth 2FA")
@ApiBearerAuth()
@Controller("api/auth/2fa")
@UseGuards(BearerAuthGuard, AccessGuard)
export class TwofaController {
  constructor(
    private readonly twofa: TwofaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  ///
  /// Public (challenge-based)
  ///

  @Post("totp/verify")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify TOTP code for an active challenge" })
  @ApiOkResponse({ type: VerifyTotpResponseDto })
  @ApiErrorResponses([400, 401, 404, 429])
  verifyTotp(@Body() dto: VerifyTotpDto): VerifyTotpResponseDto {
    const { token, user } = this.twofa.verifyTotpChallenge(
      dto.challengeId,
      dto.code,
    );
    return { token, user: toPublicUser(user) };
  }

  @Post("challenge/switch")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Switch active 2FA challenge to another method" })
  @ApiOkResponse({ type: SwitchChallengeResponseDto })
  @ApiErrorResponses([400, 404, 429])
  async switchChallenge(
    @Body() dto: SwitchChallengeDto,
    @Req() req: Request,
  ): Promise<SwitchChallengeResponseDto> {
    // Every switch to Telegram sends a new prompt to the chat
    this.rateLimit.hit("challenge.switch.ip", ipKey(extractClientIp(req)));
    this.rateLimit.hit("challenge.switch", dto.challengeId);
    const challenge = await this.twofa.switchChallenge(
      dto.challengeId,
      dto.method,
    );
    return {
      challengeId: challenge.id,
      method: challenge.method,
      expiresAt: challenge.expiresAt,
    };
  }

  @Get("challenge/:id/status")
  @Public()
  @ApiOperation({ summary: "Poll challenge status" })
  @ApiOkResponse({ type: PollChallengeResponseDto })
  @ApiErrorResponses([404])
  pollChallenge(@Param("id") id: string): PollChallengeResponseDto {
    const result = this.twofa.pollStatus(id);
    if (result.status === "approved") {
      return {
        status: "approved",
        token: result.token,
        user: toPublicUser(result.user),
      };
    }
    return result;
  }

  ///
  /// Authenticated (settings)
  ///

  @Get("status")
  @ApiOperation({ summary: "Get current user's 2FA status" })
  @ApiOkResponse({ type: TwofaStatusResponseDto })
  @ApiErrorResponses([401])
  status(@CurrentUser() user: IUser): TwofaStatusResponseDto {
    return {
      totpEnabled: !!user.totpEnabled,
      telegramEnabled: !!user.telegram2faEnabled,
      primary: user.twofaPrimary ?? null,
      methods: this.twofa.enabledMethods(user),
    };
  }

  @Post("totp/setup")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate new TOTP secret + QR" })
  @ApiOkResponse({ type: BeginTotpResponseDto })
  @ApiErrorResponses([401])
  async beginTotp(@CurrentUser() user: IUser): Promise<BeginTotpResponseDto> {
    const r = this.twofa.beginTotpSetup(user);
    return {
      secret: r.secret,
      otpauthUrl: r.otpauthUrl,
      qrDataUrl: await r.qrDataUrl,
      setupToken: r.setupToken,
    };
  }

  @Post("totp/confirm")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Confirm TOTP setup" })
  @ApiNoContentResponse({ description: "TOTP confirmed" })
  @ApiErrorResponses([400, 401, 403])
  @Audit({
    action: AuditAction.TWOFA_TOTP_ENABLE,
    category: AuditCategory.AUTH,
    resourceType: "2fa",
  })
  confirmTotp(@CurrentUser() user: IUser, @Body() dto: ConfirmTotpDto): void {
    this.twofa.confirmTotpSetup(user, dto.setupToken, dto.code);
  }

  @Post("totp/disable")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Disable TOTP" })
  @ApiNoContentResponse({ description: "TOTP disabled" })
  @ApiErrorResponses([400, 401, 429])
  @Audit({
    action: AuditAction.TWOFA_TOTP_DISABLE,
    category: AuditCategory.AUTH,
    resourceType: "2fa",
  })
  async disableTotp(
    @CurrentUser() user: IUser,
    @Body() dto: DisableTotpDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.twofa.disableTotp(user, dto.password, extractClientIp(req));
  }

  @Post("telegram/enable")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Enable Telegram 2FA (requires linked account)" })
  @ApiNoContentResponse({ description: "Telegram 2FA enabled" })
  @ApiErrorResponses([400, 401])
  @Audit({
    action: AuditAction.TWOFA_TELEGRAM_ENABLE,
    category: AuditCategory.AUTH,
    resourceType: "2fa",
  })
  enableTelegram(@CurrentUser() user: IUser): void {
    this.twofa.enableTelegram(user);
  }

  @Post("telegram/disable")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Disable Telegram 2FA" })
  @ApiNoContentResponse({ description: "Telegram 2FA disabled" })
  @ApiErrorResponses([401])
  @Audit({
    action: AuditAction.TWOFA_TELEGRAM_DISABLE,
    category: AuditCategory.AUTH,
    resourceType: "2fa",
  })
  disableTelegram(@CurrentUser() user: IUser): void {
    this.twofa.disableTelegram(user);
  }
}
