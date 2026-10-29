import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { IUser } from "@shared/types/user.types";
import { ClientPrefsDto } from "./dto/client-prefs.dto";
import { StatsService } from "./stats.service";

@ApiTags("Stats")
@ApiBearerAuth()
@Controller("api/stats")
@UseGuards(BearerAuthGuard, AccessGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Post("client")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Report interface language and theme" })
  @ApiNoContentResponse()
  @ApiErrorResponses([400, 401])
  reportClient(@CurrentUser() user: IUser, @Body() dto: ClientPrefsDto): void {
    this.statsService.rememberClient(user.id, dto);
  }
}
