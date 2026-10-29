import { ApiErrorCode } from "@/core/errors/error-codes";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import { ServersService } from "@/modules/servers/servers.service";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AssistantConversationDetail,
  AssistantSendResult,
  IAssistantConversation,
} from "@shared/types/assistant.types";
import { canSeeServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import { randomUUID } from "crypto";
import { titleFrom } from "../runner/context-builder";
import { AgentRunnerService } from "../runner/agent-runner.service";
import { hasPending } from "../runner/history";
import { AssistantSettingsService } from "../settings/assistant-settings.service";
import { ToolRegistryService } from "../tools/tool-registry.service";
import { ConversationsRepository } from "./conversations.repository";
import { MessagesRepository, type StoredMessage } from "./messages.repository";
import { presentMessage } from "./message-view";

const MAX_CONVERSATIONS = 50;

const busy = (message: string) =>
  new ConflictException({ code: ApiErrorCode.ASSISTANT_BUSY, message });

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversations: ConversationsRepository,
    private readonly messages: MessagesRepository,
    private readonly runner: AgentRunnerService,
    private readonly settings: AssistantSettingsService,
    private readonly tools: ToolRegistryService,
    private readonly servers: ServersService,
    private readonly rateLimit: RateLimitService,
  ) {}

  list(user: IUser): IAssistantConversation[] {
    return this.conversations.listByUser(user.id);
  }

  detail(user: IUser, id: string): AssistantConversationDetail {
    const conversation = this.require(user, id);
    return {
      conversation,
      messages: this.messages
        .list(id)
        .map((message) => presentMessage(message, this.kindOf)),
      running: this.runner.isRunning(id),
    };
  }

  /** Stores the user message and starts the model in the background */
  send(
    user: IUser,
    input: { conversationId?: string; content: string; serverId?: string },
  ): AssistantSendResult {
    if (!this.settings.isConfigured()) {
      throw new ConflictException({
        code: ApiErrorCode.ASSISTANT_NOT_CONFIGURED,
        message: "The assistant is not set up",
      });
    }
    const serverId = this.serverContext(user, input.serverId);
    if (input.conversationId)
      this.assertCanContinue(user, input.conversationId);
    this.rateLimit.hit("assistant", user.id);
    const conversation = input.conversationId
      ? this.require(user, input.conversationId)
      : this.open(user, input.content, serverId);

    const message: StoredMessage = {
      id: randomUUID(),
      conversationId: conversation.id,
      role: "user",
      content: input.content.trim(),
      error: null,
      createdAt: Date.now(),
      toolCalls: [],
    };
    this.messages.insert(message);
    this.conversations.touch(conversation.id, serverId);
    const current = this.require(user, conversation.id);
    this.runner.start(user, current);
    return {
      conversation: current,
      message: presentMessage(message, this.kindOf),
    };
  }

  confirm(user: IUser, id: string, callId: string, approve: boolean): void {
    const conversation = this.require(user, id);
    if (this.runner.isRunning(id)) throw busy("The assistant is still working");
    const call = this.messages.findToolCall(id, callId);
    if (!call) throw new NotFoundException("Tool call not found");
    if (call.status !== "pending") throw busy("This call was already decided");
    this.runner.decide(user, conversation, call, approve);
  }

  stop(user: IUser, id: string): void {
    this.require(user, id);
    this.runner.stop(id);
  }

  remove(user: IUser, id: string): void {
    this.runner.stop(id);
    if (!this.conversations.delete(user.id, id)) {
      throw new NotFoundException("Conversation not found");
    }
  }

  private open(user: IUser, content: string, serverId: string | null) {
    const conversation = this.conversations.create(
      user.id,
      titleFrom(content),
      serverId,
    );
    this.conversations.pruneBeyond(user.id, MAX_CONVERSATIONS);
    return conversation;
  }

  private assertCanContinue(user: IUser, id: string): void {
    this.require(user, id);
    if (this.runner.isRunning(id))
      throw busy("The assistant is still answering");
    if (hasPending(this.messages.list(id))) {
      throw busy("Confirm or cancel the pending action first");
    }
  }

  // Unknown or foreign servers are dropped instead of failing the message
  private serverContext(user: IUser, serverId?: string): string | null {
    if (!serverId || !canSeeServer(user, serverId)) return null;
    return this.servers.findById(serverId) ? serverId : null;
  }

  private require(user: IUser, id: string): IAssistantConversation {
    const conversation = this.conversations.find(user.id, id);
    if (!conversation) throw new NotFoundException("Conversation not found");
    return conversation;
  }

  private readonly kindOf = (name: string) =>
    this.tools.get(name)?.kind ?? "read";
}
