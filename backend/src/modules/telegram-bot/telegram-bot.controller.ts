import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { IUser } from "@shared/types/user.types";
import { LinkTelegramDto } from "./dto/link-telegram.dto";
import { OtpValidationDto } from "./dto/otp-validation.dto";
import {
  BotInfoResponseDto,
  GenerateOtpResponseDto,
  LinkedUserResponseDto,
} from "./dto/telegram-responses.dto";
import { TelegramBotService } from "./telegram-bot.service";

@ApiTags("Telegram Bot")
@Controller("api/telegram-bot")
export class TelegramBotController {
  constructor(
    private readonly telegramBotService: TelegramBotService,
    private readonly broadcast: ServerBroadcastService,
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
  generateOtp(@CurrentUser() user: IUser): GenerateOtpResponseDto {
    try {
      const { otp, expiresAt } = this.telegramBotService.generateOtp(user.id);

      this.broadcast.emitOtpUpdate({
        code: otp,
        expiresAt,
      });

      return { otp };
    } catch (error) {
      throw new BadRequestException("Failed to generate OTP");
    }
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
    try {
      const isValid = this.telegramBotService.validateOtp(user.id, dto.otp);

      if (isValid) {
        return { valid: true };
      } else {
        return { valid: false, error: "Invalid or expired OTP code" };
      }
    } catch (error) {
      return { valid: false, error: "Failed to validate OTP" };
    }
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
    } catch (error) {
      return { name: "", username: "", error: "Failed to get bot information" };
    }
  }

  @Get("linked-users")
  @UseGuards(BearerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get list of linked Telegram users" })
  @ApiOkResponse({
    type: [LinkedUserResponseDto],
    description: "Linked users retrieved successfully",
  })
  @ApiErrorResponses()
  async getLinkedUsers(): Promise<LinkedUserResponseDto[]> {
    try {
      return this.telegramBotService.getLinkedUsers();
    } catch (error) {
      throw new BadRequestException("Failed to get linked users");
    }
  }

  @Post("unlink-user")
  @HttpCode(204)
  @UseGuards(BearerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Unlink a Telegram user" })
  @ApiNoContentResponse({ description: "User unlinked successfully" })
  @ApiErrorResponses()
  unlinkUser(
    @CurrentUser() user: IUser,
    @Body() body: { telegramId: number },
  ): void {
    try {
      this.telegramBotService.unlinkUser(user.id, body.telegramId);
    } catch (error) {
      throw new BadRequestException("Failed to unlink user");
    }
  }
}
