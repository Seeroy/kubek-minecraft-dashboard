import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { getVersion } from "@/core/utils/updates";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { IUser } from "@shared/types/user.types";
import { AccountsService } from "./accounts.service";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { UserPreferencesResponseDto } from "./dto/user-preferences-response.dto";

// operationIds keep the AccountsController names the generated client uses
@ApiTags("Accounts")
@ApiBearerAuth()
@Controller("api/accounts")
@UseGuards(BearerAuthGuard, AccessGuard)
export class AccountPreferencesController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get("me/preferences")
  @ApiOperation({
    summary: "Get current user's preferences",
    operationId: "AccountsController_getMyPreferences",
  })
  @ApiOkResponse({ type: UserPreferencesResponseDto })
  @ApiErrorResponses([401])
  getMyPreferences(@CurrentUser() user: IUser): UserPreferencesResponseDto {
    return {
      twofaPrimary: user.twofaPrimary ?? null,
      totpEnabled: !!user.totpEnabled,
      telegram2faEnabled: !!user.telegram2faEnabled,
      dashboardLayout: user.dashboardLayout ?? null,
      lastSeenWhatsNewVersion: user.lastSeenWhatsNewVersion ?? null,
      skinName: user.skinName ?? null,
      panelVersion: getVersion(),
    };
  }

  @Patch("me/preferences")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Update current user's preferences (2FA primary, dashboard, avatar)",
    operationId: "AccountsController_updateMyPreferences",
  })
  @ApiOkResponse({ type: UserPreferencesResponseDto })
  @ApiErrorResponses([400, 401])
  updateMyPreferences(
    @CurrentUser() user: IUser,
    @Body() dto: UpdatePreferencesDto,
  ): UserPreferencesResponseDto {
    const next = { ...user };
    if (dto.twofaPrimary !== undefined) {
      if (dto.twofaPrimary === "totp" && !user.totpEnabled) {
        throw new BadRequestException("TOTP is not enabled");
      }
      if (dto.twofaPrimary === "telegram" && !user.telegram2faEnabled) {
        throw new BadRequestException("Telegram 2FA is not enabled");
      }
      next.twofaPrimary = dto.twofaPrimary;
    }
    if (dto.dashboardLayout !== undefined) {
      next.dashboardLayout = dto.dashboardLayout;
    }
    if (dto.lastSeenWhatsNewVersion !== undefined) {
      next.lastSeenWhatsNewVersion = dto.lastSeenWhatsNewVersion;
    }
    if (dto.skinName !== undefined) {
      next.skinName = dto.skinName || null;
    }
    this.accountsService.update(next);
    return {
      twofaPrimary: next.twofaPrimary ?? null,
      dashboardLayout: next.dashboardLayout ?? null,
      lastSeenWhatsNewVersion: next.lastSeenWhatsNewVersion ?? null,
      skinName: next.skinName ?? null,
      panelVersion: getVersion(),
    };
  }
}
