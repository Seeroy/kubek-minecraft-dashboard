import {
  ASSISTANT_ATTACHMENT_LIMITS,
  ASSISTANT_REASONING_LEVELS,
  type AssistantAttachmentInput,
  type AssistantCallResponse,
  type AssistantAttachmentKind,
  type AssistantReasoningLevel,
  type IAssistantConversation,
} from "@shared/types/assistant.types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

const KINDS: AssistantAttachmentKind[] = ["image", "text"];

export class AttachmentInputDto implements AssistantAttachmentInput {
  @ApiProperty({ enum: KINDS }) @IsIn(KINDS) kind!: AssistantAttachmentKind;
  @ApiProperty({ maxLength: 200 }) @IsString() @MaxLength(200) name!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MaxLength(100) mime!: string;

  @ApiProperty({ description: "Base64 for images, plain text for text files" })
  @IsString()
  @MaxLength(ASSISTANT_ATTACHMENT_LIMITS.imageChars)
  data!: string;
}

/** Composer switches, they also apply when a confirmed call resumes the run */
export class RunOptionsDto {
  @ApiPropertyOptional({
    description: "Run write tools without asking the user",
  })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @ApiPropertyOptional({ enum: ASSISTANT_REASONING_LEVELS })
  @IsOptional()
  @IsIn(ASSISTANT_REASONING_LEVELS)
  reasoning?: AssistantReasoningLevel;

  @ApiPropertyOptional({ description: "Let the model search the web" })
  @IsOptional()
  @IsBoolean()
  webSearch?: boolean;
}

export class SendMessageDto extends RunOptionsDto {
  @ApiProperty({ maxLength: 8000, description: "May be empty with attachments" })
  @IsString()
  @MaxLength(8000)
  content!: string;

  @ApiPropertyOptional({ type: [AttachmentInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ASSISTANT_ATTACHMENT_LIMITS.count)
  @ValidateNested({ each: true })
  @Type(() => AttachmentInputDto)
  attachments?: AttachmentInputDto[];

  @ApiPropertyOptional({ description: "Server the user is looking at" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  serverId?: string;
}

export class CallResponseDto implements AssistantCallResponse {
  @ApiPropertyOptional({ type: [String], description: "Picked option labels of a question" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  selected?: string[];

  @ApiPropertyOptional({ maxLength: 2000, description: "Free text answer or feedback on a declined plan" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;
}

export class ConfirmToolCallDto extends RunOptionsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  callId!: string;

  @ApiProperty({ description: "False declines a call or a plan, or skips a question" })
  @IsBoolean()
  approve!: boolean;

  @ApiPropertyOptional({ type: CallResponseDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CallResponseDto)
  response?: CallResponseDto;
}

export class ConversationDto implements IAssistantConversation {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) serverId!: string | null;
  @ApiProperty() createdAt!: number;
  @ApiProperty() updatedAt!: number;
}

export class ToolCallDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: Object }) args!: Record<string, unknown>;
  @ApiProperty({ enum: ["read", "write", "plan", "ask"] }) kind!: string;
  @ApiProperty({ enum: ["pending", "running", "done", "error", "rejected"] })
  status!: string;
  @ApiProperty({ type: String, nullable: true }) serverId!: string | null;
  @ApiProperty({ type: String, nullable: true }) result!: string | null;
  @ApiProperty({
    type: Object,
    nullable: true,
    description: "diff, command, properties or summary preview",
  })
  preview!: Record<string, unknown> | null;
}

export class UsageDto {
  @ApiProperty() promptTokens!: number;
  @ApiProperty() completionTokens!: number;
  @ApiPropertyOptional() cachedTokens?: number;
  @ApiProperty({ type: Number, nullable: true }) costUsd!: number | null;
}

export class AttachmentDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: KINDS }) kind!: string;
  @ApiProperty() name!: string;
  @ApiProperty() mime!: string;
  @ApiProperty() size!: number;
}

export class SourceDto {
  @ApiProperty() url!: string;
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
}

export class MessageDto {
  @ApiProperty() id!: string;
  @ApiProperty() conversationId!: string;
  @ApiProperty({ enum: ["user", "assistant"] }) role!: string;
  @ApiProperty() content!: string;
  @ApiProperty({ enum: ["done", "error"] }) status!: string;
  @ApiProperty({ type: String, nullable: true }) error!: string | null;
  @ApiProperty({ type: [ToolCallDto] }) toolCalls!: ToolCallDto[];
  @ApiProperty() createdAt!: number;
  @ApiProperty({ type: UsageDto, nullable: true }) usage!: UsageDto | null;
  @ApiProperty({ type: [AttachmentDto] }) attachments!: AttachmentDto[];
  @ApiProperty({ type: String, nullable: true }) reasoning!: string | null;
  @ApiProperty({ type: Number, nullable: true }) reasoningMs!: number | null;
  @ApiProperty({ type: [SourceDto] }) sources!: SourceDto[];
}

export class ConversationDetailDto {
  @ApiProperty({ type: ConversationDto }) conversation!: ConversationDto;
  @ApiProperty({ type: [MessageDto] }) messages!: MessageDto[];
  @ApiProperty() running!: boolean;
}

export class SendResultDto {
  @ApiProperty({ type: ConversationDto }) conversation!: ConversationDto;
  @ApiProperty({ type: MessageDto }) message!: MessageDto;
}
