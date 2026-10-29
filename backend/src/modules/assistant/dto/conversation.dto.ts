import type { IAssistantConversation } from "@shared/types/assistant.types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class SendMessageDto {
  @ApiProperty({ maxLength: 8000 })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;

  @ApiPropertyOptional({ description: "Server the user is looking at" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  serverId?: string;
}

export class ConfirmToolCallDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  callId!: string;

  @ApiProperty()
  @IsBoolean()
  approve!: boolean;
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
  @ApiProperty({ enum: ["read", "write"] }) kind!: string;
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

export class MessageDto {
  @ApiProperty() id!: string;
  @ApiProperty() conversationId!: string;
  @ApiProperty({ enum: ["user", "assistant"] }) role!: string;
  @ApiProperty() content!: string;
  @ApiProperty({ enum: ["done", "error"] }) status!: string;
  @ApiProperty({ type: String, nullable: true }) error!: string | null;
  @ApiProperty({ type: [ToolCallDto] }) toolCalls!: ToolCallDto[];
  @ApiProperty() createdAt!: number;
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
