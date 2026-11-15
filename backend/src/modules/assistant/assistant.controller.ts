import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AccessArea } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import { ConversationsService } from "./conversations/conversations.service";
import {
  ConfirmToolCallDto,
  ConversationDetailDto,
  ConversationDto,
  SendMessageDto,
  SendResultDto,
} from "./dto/conversation.dto";

@ApiTags("Assistant")
@ApiBearerAuth()
@Controller("api/assistant/conversations")
@UseGuards(BearerAuthGuard, AccessGuard)
@RequireAccess(AccessArea.ASSISTANT, "read")
export class AssistantController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: "Conversations of the current user, newest first" })
  @ApiOkResponse({ type: [ConversationDto] })
  @ApiErrorResponses([401, 403])
  list(@CurrentUser() user: IUser): ConversationDto[] {
    return this.conversations.list(user);
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Start a conversation, the answer streams over WS" })
  @ApiAcceptedResponse({ type: SendResultDto })
  @ApiErrorResponses([400, 401, 403, 409, 429])
  create(
    @CurrentUser() user: IUser,
    @Body() dto: SendMessageDto,
  ): SendResultDto {
    return this.conversations.send(user, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Messages and tool calls of a conversation" })
  @ApiOkResponse({ type: ConversationDetailDto })
  @ApiErrorResponses([401, 403, 404])
  detail(
    @CurrentUser() user: IUser,
    @Param("id") id: string,
  ): ConversationDetailDto {
    return this.conversations.detail(user, id);
  }

  @Post(":id/messages")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Send a message, the answer streams over WS" })
  @ApiAcceptedResponse({ type: SendResultDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 429])
  send(
    @CurrentUser() user: IUser,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ): SendResultDto {
    return this.conversations.send(user, { ...dto, conversationId: id });
  }

  @Post(":id/confirm")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Run or decline a call that waits for the user" })
  @ApiAcceptedResponse({ description: "Decision accepted" })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  confirm(
    @CurrentUser() user: IUser,
    @Param("id") id: string,
    @Body() dto: ConfirmToolCallDto,
  ): void {
    const { callId, approve, ...options } = dto;
    this.conversations.confirm(user, id, callId, approve, options);
  }

  @Get(":id/attachments/:attachmentId")
  @ApiOperation({ summary: "File the user attached to a message" })
  @ApiOkResponse({ description: "Raw file with its own content type" })
  @ApiErrorResponses([401, 403, 404])
  attachment(
    @CurrentUser() user: IUser,
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
  ): StreamableFile {
    const file = this.conversations.attachment(user, id, attachmentId);
    return new StreamableFile(file.data, {
      type: file.mime,
      length: file.data.length,
    });
  }

  @Post(":id/stop")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Stop the running answer" })
  @ApiNoContentResponse()
  @ApiErrorResponses([401, 403, 404])
  stop(@CurrentUser() user: IUser, @Param("id") id: string): void {
    this.conversations.stop(user, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a conversation" })
  @ApiNoContentResponse()
  @ApiErrorResponses([401, 403, 404])
  remove(@CurrentUser() user: IUser, @Param("id") id: string): void {
    this.conversations.remove(user, id);
  }
}
