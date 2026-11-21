import { getErrorMessage } from "@/core/utils/error";
import { ServersService } from "@/modules/servers/servers.service";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable, Logger } from "@nestjs/common";
import type {
  AssistantCallResponse,
  AssistantRunOptions,
  IAssistantConversation,
} from "@shared/types/assistant.types";
import type { IUser } from "@shared/types/user.types";
import { WsAssistantEventTypes } from "@shared/types/ws/assistant-events.types";
import { randomUUID } from "crypto";
import {
  MessagesRepository,
  type StoredToolCall,
} from "../conversations/messages.repository";
import { LlmClient } from "../llm/llm-client";
import {
  reasoningOptions,
  webSearchServerTools,
} from "../llm/provider-features";
import { AssistantSettingsService } from "../settings/assistant-settings.service";
import { ModelCapabilitiesService } from "../settings/model-capabilities.service";
import { ToolRegistryService } from "../tools/tool-registry.service";
import { AgentLoop, type LoopEvents, type LoopRun } from "./agent-loop";
import {
  AssistantEventsService,
  type AssistantRunEvent,
} from "./assistant-events.service";
import { buildSystemPrompt } from "./context-builder";

/** Runs conversations in the background and streams them to the owner's sockets */
@Injectable()
export class AgentRunnerService {
  private readonly logger = new Logger(AgentRunnerService.name);
  private readonly active = new Map<string, AbortController>();
  // Settles when the conversation's current run is over, decisions queue behind it
  private readonly runs = new Map<string, Promise<void>>();
  // Calls with a decision waiting for the current run to end
  private readonly queued = new Set<string>();
  private readonly loop: AgentLoop;

  constructor(
    messages: MessagesRepository,
    tools: ToolRegistryService,
    private readonly settings: AssistantSettingsService,
    private readonly servers: ServersService,
    private readonly broadcast: ServerBroadcastService,
    private readonly capabilities: ModelCapabilitiesService,
    private readonly bus: AssistantEventsService,
  ) {
    this.loop = new AgentLoop({
      complete: (req, signal, onText, onReasoning) =>
        new LlmClient(this.settings.connection()).stream(req, {
          signal,
          onText,
          onReasoning,
        }),
      messages,
      tools,
      newId: randomUUID,
      now: Date.now,
      costOf: (usage) => this.settings.costOf(usage),
    });
  }

  isRunning(conversationId: string): boolean {
    return this.active.has(conversationId);
  }

  isDecided(callId: string): boolean {
    return this.queued.has(callId);
  }

  start(
    user: IUser,
    conversation: IAssistantConversation,
    options: AssistantRunOptions,
  ): void {
    this.background(user, conversation.id, async (signal, events) =>
      this.loop.run(
        await this.runOf(user, conversation, signal, events, options),
      ),
    );
  }

  /** Applies the user's decision, then lets the model continue, waits out a run still in flight */
  decide(
    user: IUser,
    conversation: IAssistantConversation,
    call: StoredToolCall,
    approve: boolean,
    options: AssistantRunOptions,
    response?: AssistantCallResponse,
  ): void {
    const current = this.runs.get(conversation.id);
    if (current) {
      this.queued.add(call.id);
      void current.then(() => {
        this.queued.delete(call.id);
        this.decide(user, conversation, call, approve, options, response);
      });
      return;
    }
    this.background(user, conversation.id, async (signal, events) => {
      const run = await this.runOf(user, conversation, signal, events, options);
      await this.loop.decide(run, call, approve, response);
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
    const done = work(controller.signal, events)
      .catch((err) => {
        this.logger.error(`Assistant run failed: ${getErrorMessage(err)}`);
        events.error(getErrorMessage(err));
      })
      .finally(() => {
        if (this.active.get(conversationId) === controller)
          this.active.delete(conversationId);
        if (this.runs.get(conversationId) === done)
          this.runs.delete(conversationId);
      });
    this.runs.set(conversationId, done);
  }

  private async runOf(
    user: IUser,
    conversation: IAssistantConversation,
    signal: AbortSignal,
    events: LoopEvents,
    options: AssistantRunOptions,
  ): Promise<LoopRun> {
    const settings = this.settings.get();
    const caps = await this.capabilities.resolve();
    // OpenRouter searches on its side, DeepSeek search runs as panel tools
    const webSearch = !!options.webSearch && caps.webSearch;
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
      autoApprove: options.autoApprove ?? false,
      vision: caps.vision === true,
      // Gateways pass DeepSeek models through, the rule comes with the model
      requireReasoning:
        caps.kind === "deepseek" || /deepseek/i.test(settings.model),
      options: reasoningOptions(
        caps.kind,
        options.reasoning ?? "auto",
        caps.reasoningMandatory,
      ),
      serverTools: webSearch ? webSearchServerTools(caps.kind) : undefined,
      features: new Set(
        webSearch && caps.kind === "deepseek" ? ["webSearch"] : [],
      ),
      signal,
      events,
    };
  }

  private events(userId: string, conversationId: string): LoopEvents {
    const room = `user:${userId}`;
    const ws = this.broadcast;
    // The socket feeds the web panel, the bus other transports like the Telegram bot
    const bus = (event: AssistantRunEvent) =>
      this.bus.emit(conversationId, event);
    return {
      delta: (messageId, text, channel) => {
        ws.emitToRoom(room, WsAssistantEventTypes.DELTA, {
          conversationId,
          messageId,
          text,
          ...(channel ? { channel } : {}),
        });
        bus({ type: "delta", messageId, text, channel });
      },
      message: (message) => {
        ws.emitToRoom(room, WsAssistantEventTypes.MESSAGE, {
          conversationId,
          message,
        });
        bus({ type: "message", message });
      },
      tool: (messageId, call) => {
        ws.emitToRoom(room, WsAssistantEventTypes.TOOL, {
          conversationId,
          messageId,
          call,
        });
        bus({ type: "tool", messageId, call });
      },
      confirm: (messageId, call) => {
        ws.emitToRoom(room, WsAssistantEventTypes.CONFIRM, {
          conversationId,
          messageId,
          call,
        });
        bus({ type: "confirm", messageId, call });
      },
      done: (finished) => {
        ws.emitToRoom(room, WsAssistantEventTypes.DONE, {
          conversationId,
          finished,
        });
        bus({ type: "done", finished });
      },
      error: (error) => {
        ws.emitToRoom(room, WsAssistantEventTypes.ERROR, {
          conversationId,
          error,
        });
        bus({ type: "error", error });
      },
    };
  }
}
