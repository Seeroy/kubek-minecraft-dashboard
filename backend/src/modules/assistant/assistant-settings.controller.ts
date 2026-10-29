import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { diffChanges } from "@/modules/audit-log/audit-diff";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { RevealedSecretDto } from "@/modules/kubek/dto/configuration.dto";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AccessArea } from "@shared/access/areas";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { Request } from "express";
import {
  AssistantConnectionDraftDto,
  AssistantModelsDto,
  AssistantSettingsResponseDto,
  AssistantSettingsViewDto,
  AssistantStatusDto,
  AssistantTestResultDto,
  UpdateAssistantSettingsDto,
} from "./dto/assistant-settings.dto";
import { ASSISTANT_PRESETS } from "./llm/presets";
import { AssistantProviderService } from "./settings/assistant-provider.service";
import { AssistantSettingsService } from "./settings/assistant-settings.service";

@ApiTags("Assistant")
@ApiBearerAuth()
@Controller("api/assistant")
@UseGuards(BearerAuthGuard, AccessGuard)
export class AssistantSettingsController {
  constructor(
    private readonly settings: AssistantSettingsService,
    private readonly provider: AssistantProviderService,
  ) {}

  @Get("status")
  @ApiOperation({ summary: "Whether the assistant is set up" })
  @ApiOkResponse({ type: AssistantStatusDto })
  @ApiErrorResponses([401, 403])
  @RequireAccess(AccessArea.ASSISTANT, "read")
  status(): AssistantStatusDto {
    return this.settings.status();
  }

  @Get("settings")
  @ApiOperation({ summary: "Provider settings and presets, the key is masked" })
  @ApiOkResponse({ type: AssistantSettingsResponseDto })
  @ApiErrorResponses([401, 403])
  @RequireAccess(AccessArea.ASSISTANT, "manage")
  getSettings(): AssistantSettingsResponseDto {
    return { settings: this.settings.view(), presets: ASSISTANT_PRESETS };
  }

  @Put("settings")
  @ApiOperation({ summary: "Update provider settings" })
  @ApiOkResponse({ type: AssistantSettingsViewDto })
  @ApiErrorResponses([400, 401, 403])
  @RequireAccess(AccessArea.ASSISTANT, "manage")
  @Audit({
    action: AuditAction.SETTINGS_UPDATE,
    category: AuditCategory.SETTINGS,
    resourceType: "assistant",
  })
  updateSettings(
    @Body() dto: UpdateAssistantSettingsDto,
    @Req() req: Request,
  ): AssistantSettingsViewDto {
    const before = this.settings.snapshot();
    const view = this.settings.update(dto);
    const changes = diffChanges(before, this.settings.snapshot(), {
      secrets: ["apiKey"],
    });
    auditNote(req, { changes });
    return view;
  }

  @Get("settings/api-key")
  @ApiOperation({ summary: "Reveal the stored provider key" })
  @ApiOkResponse({ type: RevealedSecretDto })
  @ApiErrorResponses([401, 403])
  @RequireAccess(AccessArea.ASSISTANT, "manage")
  @Audit({
    action: AuditAction.SETTINGS_SECRET_VIEW,
    category: AuditCategory.SETTINGS,
    resourceType: "config",
    resolve: () => ({ details: { path: "assistant.apiKey" } }),
  })
  revealKey(): RevealedSecretDto {
    return { value: this.settings.revealKey() };
  }

  // POST so a key typed into the form never ends up in a URL
  @Post("settings/models")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List models the provider serves" })
  @ApiOkResponse({ type: AssistantModelsDto })
  @ApiErrorResponses([400, 401, 403, 502])
  @RequireAccess(AccessArea.ASSISTANT, "manage")
  async models(
    @Body() draft: AssistantConnectionDraftDto,
  ): Promise<AssistantModelsDto> {
    return { models: await this.provider.models(draft) };
  }

  @Post("settings/test")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send a test prompt to the provider" })
  @ApiOkResponse({ type: AssistantTestResultDto })
  @ApiErrorResponses([400, 401, 403])
  @RequireAccess(AccessArea.ASSISTANT, "manage")
  test(
    @Body() draft: AssistantConnectionDraftDto,
  ): Promise<AssistantTestResultDto> {
    return this.provider.test(draft);
  }
}
