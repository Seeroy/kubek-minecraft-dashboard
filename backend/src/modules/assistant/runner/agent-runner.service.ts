import { getErrorMessage } from "@/core/utils/error";
import { ServersService } from "@/modules/servers/servers.service";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable, Logger } from "@nestjs/common";
import type { IAssistantConversation } from "@shared/types/assistant.types";
import type { IUser } from "@shared/types/user.types";
import { WsAssistantEventTypes } from "@shared/types/ws/assistant-events.types";
import { randomUUID } from "crypto";
import {
  MessagesRepository,
  type StoredToolCall,
} from "../conversations/messages.repository";
import { LlmClient } from "../llm/llm-client";
import { AssistantSettingsService } from "../settings/assistant-settings.service";
import { ToolRegistryService } from "../tools/tool-registry.service";
import { AgentLoop, type LoopEvents } from "./agent-loop";
import { buildSystemPrompt } from "./context-builder";

/** Runs conversations in the background and streams them to the owner's sockets */
@Injectable()
export class AgentRunnerService {
  private readonly logger = new Logger(AgentRunnerService.name);
  private readonly active = new Map<string, AbortController>();
  private readonly loop: AgentLoop;

  constructor(
    messages: MessagesRepository,
    tools: ToolRegistryService,
    private readonly settings: AssistantSettingsService,
    private readonly servers: ServersService,
    private readonly broadcast: ServerBroadcastService,
  ) {
    this.loop = new AgentLoop({
      complete: (req, signal, onText) =>
        new LlmClient(this.settings.connection()).stream(req, {
          signal,
          onText,
        }),
      messages,
      tools,
      newId: randomUUID,
      now: Date.now,
    });
  }

  isRunning(conversationId: string): boolean {
    return this.active.has(conversationId);
  }

  start(user: IUser, conversation: IAssistantConversation): void {
    this.background(user, conversation.id, (signal, events) =>
      this.loop.run(this.runOf(user, conversation, signal, events)),
    );
  }

  /** Applies the user's decision, then lets the model continue */
  decide(
    user: IUser,
    conversation: IAssistantConversation,
    call: StoredToolCall,
    approve: boolean,
  ): void {
    this.background(user, conversation.id, async (signal, events) => {
      const run = this.runOf(user, conversation, signal, events);
      await this.loop.decide(run, call, approve);
      await this.loop.run(run);
    });
  }

  stop(conversationId: string): void {
    this.active.get(conversationId)?.abort();
  }

  private background(
    user: IUser,
    conversationId: string,
    work: (signal: AbortSignal, events: LoopEvents) => Promise<void>,
  ): void {
    const controller = new AbortController();
    this.active.set(conversationId, controller);
    const events = this.events(user.id, conversationId);
    void work(controller.signal, events)
      .catch((err) => {
        this.logger.error(`Assistant run failed: ${getErrorMessage(err)}`);
        events.error(getErrorMessage(err));
      })
      .finally(() => {
        if (this.active.get(conversationId) === controller)
          this.active.delete(conversationId);
      });
  }

  private runOf(
    user: IUser,
    conversation: IAssistantConversation,
    signal: AbortSignal,
    events: LoopEvents,
  ) {
    const settings = this.settings.get();
    const server = conversation.serverId
      ? this.servers.findById(conversation.serverId)
      : null;
    return {
      conversationId: conversation.id,
      user,
      systemPrompt: buildSystemPrompt({ user, server, now: new Date() }),
      model: settings.model,
      temperature: settings.temperature,
      maxSteps: settings.maxSteps,
      signal,
      events,
    };
  }

  private events(userId: string, conversationId: string): LoopEvents {
    const room = `user:${userId}`;
    const ws = this.broadcast;
    return {
      delta: (messageId, text) =>
        ws.emitToRoom(room, WsAssistantEventTypes.DELTA, {
          conversationId,
          messageId,
          text,
        }),
      message: (message) =>
        ws.emitToRoom(room, WsAssistantEventTypes.MESSAGE, {
          conversationId,
          message,
        }),
      tool: (messageId, call) =>
        ws.emitToRoom(room, WsAssistantEventTypes.TOOL, {
          conversationId,
          messageId,
          call,
        }),
      confirm: (messageId, call) =>
        ws.emitToRoom(room, WsAssistantEventTypes.CONFIRM, {
          conversationId,
          messageId,
          call,
        }),
      done: (finished) =>
        ws.emitToRoom(room, WsAssistantEventTypes.DONE, {
          conversationId,
          finished,
        }),
      error: (error) =>
        ws.emitToRoom(room, WsAssistantEventTypes.ERROR, {
          conversationId,
          error,
        }),
    };
  }
}
