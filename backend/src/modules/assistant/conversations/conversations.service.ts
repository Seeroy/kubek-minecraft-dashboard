import { ApiErrorCode } from "@/core/errors/error-codes";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import { ServersService } from "@/modules/servers/servers.service";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ASSISTANT_ASK_TOOL,
  ASSISTANT_ATTACHMENT_LIMITS,
  type AssistantAttachmentInput,
  type AssistantCallResponse,
  type AssistantConversationDetail,
  type AssistantRunOptions,
  type AssistantSendResult,
  type IAssistantConversation,
} from "@shared/types/assistant.types";
import { canSeeServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import { randomUUID } from "crypto";
import { titleFrom } from "../runner/context-builder";
import { AgentRunnerService } from "../runner/agent-runner.service";
import { hasPending } from "../runner/history";
import { questionAnswer, questionArgs } from "../tools/chat.tools";
import { AssistantSettingsService } from "../settings/assistant-settings.service";
import { ToolRegistryService } from "../tools/tool-registry.service";
import { ConversationsRepository } from "./conversations.repository";
import {
  MessagesRepository,
  type StoredAttachment,
  type StoredMessage,
} from "./messages.repository";
import { presentMessage } from "./message-view";

const MAX_CONVERSATIONS = 50;

// What providers accept as image input
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

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
    input: AssistantRunOptions & {
      conversationId?: string;
      content: string;
      serverId?: string;
      attachments?: AssistantAttachmentInput[];
    },
  ): AssistantSendResult {
    const attachments = toAttachments(input.attachments ?? []);
    const content = input.content.trim();
    if (!content && !attachments.length)
      throw new BadRequestException("The message is empty");
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
      : this.open(user, content || attachments[0].name, serverId);

    const message: StoredMessage = {
      id: randomUUID(),
      conversationId: conversation.id,
      role: "user",
      content,
      error: null,
      createdAt: Date.now(),
      toolCalls: [],
      attachments,
    };
    this.messages.insert(message);
    this.conversations.touch(conversation.id, serverId);
    const current = this.require(user, conversation.id);
    const { autoApprove, reasoning, webSearch } = input;
    this.runner.start(user, current, { autoApprove, reasoning, webSearch });
    return {
      conversation: current,
      message: presentMessage(message, this.kindOf),
    };
  }

  confirm(
    user: IUser,
    id: string,
    callId: string,
    approve: boolean,
    options: AssistantRunOptions = {},
    response?: AssistantCallResponse,
  ): void {
    const conversation = this.require(user, id);
    // A run still in flight is fine, the runner queues the decision behind it
    const call = this.messages.findToolCall(id, callId);
    if (!call) throw new NotFoundException("Tool call not found");
    if (call.status !== "pending" || this.runner.isDecided(callId))
      throw busy("This call was already decided");
    if (approve && call.name === ASSISTANT_ASK_TOOL) {
      const question = questionArgs.safeParse(call.args);
      if (question.success && !questionAnswer(question.data, response))
        throw new BadRequestException("Pick an option or write an answer");
    }
    this.runner.decide(user, conversation, call, approve, options, response);
  }

  /** Question the assistant waits on, a plain message in chat apps answers it */
  pendingQuestion(user: IUser, id: string): { callId: string } | null {
    this.require(user, id);
    const last = this.messages.list(id).at(-1);
    const call = last?.toolCalls.find(
      (item) => item.name === ASSISTANT_ASK_TOOL && item.status === "pending",
    );
    return call && !this.runner.isDecided(call.id) ? { callId: call.id } : null;
  }

  attachment(user: IUser, id: string, attachmentId: string): StoredAttachment {
    this.require(user, id);
    const file = this.messages.findAttachment(id, attachmentId);
    if (!file) throw new NotFoundException("Attachment not found");
    return file;
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

// The DTO caps sizes, this checks what only the content can tell
function toAttachments(inputs: AssistantAttachmentInput[]): StoredAttachment[] {
  const limits = ASSISTANT_ATTACHMENT_LIMITS;
  if (inputs.filter((file) => file.kind === "image").length > limits.images)
    throw new BadRequestException(`At most ${limits.images} images per message`);
  return inputs.map((file) => {
    // The name goes into a tag the model reads, keep it on one line and unquoted
    const name = file.name.replace(/["\r\n<>]/g, "").trim() || "file";
    if (file.kind === "text") {
      if (file.data.length > limits.textChars)
        throw new BadRequestException(`${name} is too large`);
      return { id: randomUUID(), kind: "text", name, mime: "text/plain", data: Buffer.from(file.data, "utf8") };
    }
    const data = Buffer.from(file.data, "base64");
    if (!IMAGE_TYPES.has(file.mime) || !data.length)
      throw new BadRequestException(`${name} is not a PNG, JPEG, WebP or GIF image`);
    return { id: randomUUID(), kind: "image", name, mime: file.mime, data };
  });
}
