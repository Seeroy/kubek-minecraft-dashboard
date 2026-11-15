import type {
  AssistantPreset,
  AssistantSettingsView,
  AssistantStatus,
  AssistantTestResult,
} from "@shared/types/assistant.types";
import { SecretHintDto } from "@/modules/kubek/dto/configuration.dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  AssistantConnectionDraft,
  AssistantPresetId,
  AssistantSettingsUpdate,
} from "@shared/types/assistant.types";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { ASSISTANT_STEPS } from "@shared/types/assistant.types";
import { PRESET_IDS } from "../llm/presets";

// Local providers live on plain http hosts without a TLD
const URL_RULES = {
  protocols: ["http", "https"],
  require_tld: false,
  require_protocol: true,
};

export class AssistantConnectionDraftDto implements AssistantConnectionDraft {
  @ApiProperty({ example: "http://localhost:11434/v1" })
  @IsUrl(URL_RULES)
  @MaxLength(300)
  baseUrl!: string;

  @ApiPropertyOptional({ description: "Blank keeps the stored key" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;
}

export class UpdateAssistantSettingsDto implements AssistantSettingsUpdate {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: PRESET_IDS })
  @IsOptional()
  @IsIn(PRESET_IDS)
  preset?: AssistantPresetId;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_RULES)
  @MaxLength(300)
  baseUrl?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: "Blank or missing keeps the stored key, null clears it",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  apiKey?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({
    minimum: ASSISTANT_STEPS.min,
    maximum: ASSISTANT_STEPS.max,
  })
  @IsOptional()
  @IsInt()
  @Min(ASSISTANT_STEPS.min)
  @Max(ASSISTANT_STEPS.max)
  maxSteps?: number;

  @ApiPropertyOptional({ minimum: 0, description: "USD per million prompt tokens, 0 when unknown" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000)
  priceInput?: number;

  @ApiPropertyOptional({ minimum: 0, description: "USD per million completion tokens, 0 when unknown" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000)
  priceOutput?: number;
}

export class AssistantPresetDto implements AssistantPreset {
  @ApiProperty({ enum: PRESET_IDS }) id!: AssistantPresetId;
  @ApiProperty() label!: string;
  @ApiProperty() baseUrl!: string;
  @ApiProperty() requiresKey!: boolean;
  @ApiProperty() modelHint!: string;
  @ApiProperty() local!: boolean;
}

export class AssistantSettingsViewDto implements AssistantSettingsView {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ enum: PRESET_IDS }) preset!: AssistantPresetId;
  @ApiProperty() baseUrl!: string;
  @ApiProperty() model!: string;
  @ApiProperty() temperature!: number;
  @ApiProperty() maxSteps!: number;
  @ApiProperty() priceInput!: number;
  @ApiProperty() priceOutput!: number;
  @ApiProperty({ type: SecretHintDto }) apiKey!: SecretHintDto;
}

export class AssistantSettingsResponseDto {
  @ApiProperty({ type: AssistantSettingsViewDto })
  settings!: AssistantSettingsViewDto;

  @ApiProperty({ type: [AssistantPresetDto] })
  presets!: AssistantPresetDto[];
}

export class AssistantModelsDto {
  @ApiProperty({ type: [String] }) models!: string[];
}

export class AssistantTestResultDto implements AssistantTestResult {
  @ApiProperty() ok!: boolean;
  @ApiProperty() latencyMs!: number;
  @ApiProperty({ type: String, nullable: true }) error!: string | null;
}

export class AssistantPricingDto {
  @ApiProperty() input!: number;
  @ApiProperty() output!: number;
}

export class AssistantStatusDto implements AssistantStatus {
  @ApiProperty() enabled!: boolean;
  @ApiProperty() configured!: boolean;
  @ApiProperty({ type: String, nullable: true }) model!: string | null;
  @ApiProperty({ type: String, nullable: true }) provider!: string | null;
  @ApiProperty() local!: boolean;
  @ApiProperty({ type: AssistantPricingDto, nullable: true })
  pricing!: AssistantPricingDto | null;
  @ApiProperty({ type: Number, nullable: true }) usdRub!: number | null;
}
