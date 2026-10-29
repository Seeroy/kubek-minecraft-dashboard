import { getErrorMessage } from "@/core/utils/error";
import type {
  AssistantToolCall,
  AssistantToolPreview,
  IAssistantMessage,
} from "@shared/types/assistant.types";
import type { IUser } from "@shared/types/user.types";
import type {
  ChatCompletion,
  ChatRequest,
  ChatToolSpec,
  StreamedToolCall,
} from "../llm/llm.types";
import type {
  IMessagesRepository,
  StoredMessage,
  StoredToolCall,
} from "../conversations/messages.repository";
import { presentMessage, presentToolCall } from "../conversations/message-view";
import { parseToolArgs } from "../tools/tool-schema";
import type {
  AssistantTool,
  ToolContext,
  ToolResult,
} from "../tools/tool.types";
import { DECLINED, buildHistory, hasPending, stepsSinceUser } from "./history";

export interface ToolPort {
  specs(user: IUser): ChatToolSpec[];
  get(name: string): AssistantTool | undefined;
  denyReason(user: IUser, tool: AssistantTool, args: unknown): string | null;
  preview(
    ctx: ToolContext,
    tool: AssistantTool,
    args: unknown,
  ): Promise<AssistantToolPreview>;
  execute(
    ctx: ToolContext,
    tool: AssistantTool,
    args: unknown,
  ): Promise<ToolResult>;
}

/** Events of one conversation, the transport decides where they go */
export interface LoopEvents {
  delta(messageId: string, text: string): void;
  message(message: IAssistantMessage): void;
  tool(messageId: string, call: AssistantToolCall): void;
  confirm(messageId: string, call: AssistantToolCall): void;
  done(finished: boolean): void;
  error(error: string): void;
}

export interface LoopPorts {
  complete(
    req: ChatRequest,
    signal: AbortSignal,
    onText: (text: string) => void,
  ): Promise<ChatCompletion>;
  messages: Pick<IMessagesRepository, "list" | "insert" | "updateToolCall">;
  tools: ToolPort;
  newId(): string;
  now(): number;
}

export interface LoopRun {
  conversationId: string;
  user: IUser;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxSteps: number;
  signal: AbortSignal;
  events: LoopEvents;
}

interface PlannedCall {
  stored: StoredToolCall;
  tool?: AssistantTool;
  args?: unknown;
}

export const STEP_LIMIT = "Step limit reached, send a message to continue";
export const STOPPED = "Stopped";

/** Model, tools, model again, until an answer, a step limit or a write call to confirm */
export class AgentLoop {
  constructor(private readonly ports: LoopPorts) {}

  async run(run: LoopRun): Promise<void> {
    for (;;) {
      const history = this.ports.messages.list(run.conversationId);
      if (hasPending(history)) return run.events.done(false);
      if (stepsSinceUser(history) >= run.maxSteps) {
        this.save(run, "", STEP_LIMIT, []);
        return run.events.done(true);
      }

      const next = await this.step(run, history);
      if (next === "stop") return;
      if (next === "paused") return run.events.done(false);
      if (next === "answered") return run.events.done(true);
    }
  }

  /** Runs or declines a call that waited for the user */
  async decide(
    run: Pick<LoopRun, "conversationId" | "user" | "signal" | "events">,
    call: StoredToolCall,
    approve: boolean,
  ): Promise<void> {
    const ctx = this.context(run);
    const tool = this.ports.tools.get(call.name);
    const parsed = tool?.args.safeParse(call.args);
    if (!approve || !tool || !parsed?.success) {
      const result = approve ? "The call is no longer valid" : DECLINED;
      this.update(run, call, {
        status: approve ? "error" : "rejected",
        result,
      });
      return;
    }
    const running = this.update(run, call, { status: "running" });
    await this.execute(run, ctx, { stored: running, tool, args: parsed.data });
  }

  private async step(
    run: LoopRun,
    history: StoredMessage[],
  ): Promise<"stop" | "paused" | "answered" | "continue"> {
    const messageId = this.ports.newId();
    let streamed = "";
    let completion: ChatCompletion;
    try {
      completion = await this.ports.complete(
        {
          model: run.model,
          temperature: run.temperature,
          messages: [
            { role: "system", content: run.systemPrompt },
            ...buildHistory(history),
          ],
          tools: this.ports.tools.specs(run.user),
        },
        run.signal,
        (text) => {
          streamed += text;
          run.events.delta(messageId, text);
        },
      );
    } catch (err) {
      const stopped = run.signal.aborted;
      const error = stopped ? STOPPED : getErrorMessage(err);
      this.save(run, streamed, error, [], messageId);
      if (stopped) run.events.done(true);
      else run.events.error(error);
      return "stop";
    }

    const ctx = this.context(run);
    const planned = await Promise.all(
      completion.toolCalls.map((call) => this.plan(ctx, messageId, call)),
    );
    this.save(
      run,
      completion.content,
      null,
      planned.map((p) => p.stored),
      messageId,
    );
    if (!planned.length) return "answered";

    for (const call of planned) {
      if (call.stored.status === "running") await this.execute(run, ctx, call);
    }
    const pending = planned.filter((call) => call.stored.status === "pending");
    for (const call of pending) {
      run.events.confirm(messageId, this.present(call.stored));
    }
    if (run.signal.aborted) {
      run.events.done(true);
      return "stop";
    }
    return pending.length ? "paused" : "continue";
  }

  // Validates a call and decides whether it runs now or waits for the user
  private async plan(
    ctx: ToolContext,
    messageId: string,
    call: StreamedToolCall,
  ): Promise<PlannedCall> {
    const tool = this.ports.tools.get(call.name);
    const parsed = tool ? parseToolArgs(tool, call.arguments) : null;
    const stored: StoredToolCall = {
      id: this.ports.newId(),
      messageId,
      name: call.name,
      args: parsed?.raw ?? {},
      status: "error",
      result: null,
      preview: null,
    };
    if (!tool || !parsed)
      return { stored: { ...stored, result: `Unknown tool ${call.name}` } };
    if (!parsed.ok) return { stored: { ...stored, result: parsed.error } };

    const denied = this.ports.tools.denyReason(ctx.user, tool, parsed.args);
    if (denied) return { stored: { ...stored, result: denied } };
    if (tool.kind === "read") {
      return {
        stored: { ...stored, status: "running" },
        tool,
        args: parsed.args,
      };
    }
    try {
      const preview = await this.ports.tools.preview(ctx, tool, parsed.args);
      return {
        stored: { ...stored, status: "pending", preview },
        tool,
        args: parsed.args,
      };
    } catch (err) {
      return { stored: { ...stored, result: getErrorMessage(err) } };
    }
  }

  private async execute(
    run: Pick<LoopRun, "events">,
    ctx: ToolContext,
    call: PlannedCall,
  ): Promise<void> {
    const result = await this.ports.tools.execute(ctx, call.tool!, call.args);
    call.stored = this.update(run, call.stored, {
      status: result.isError ? "error" : "done",
      result: result.content,
    });
  }

  private update(
    run: Pick<LoopRun, "events">,
    call: StoredToolCall,
    patch: Partial<Pick<StoredToolCall, "status" | "result">>,
  ): StoredToolCall {
    this.ports.messages.updateToolCall(call.id, patch);
    const next = { ...call, ...patch };
    run.events.tool(call.messageId, this.present(next));
    return next;
  }

  private save(
    run: LoopRun,
    content: string,
    error: string | null,
    toolCalls: StoredToolCall[],
    id = this.ports.newId(),
  ): void {
    const message: StoredMessage = {
      id,
      conversationId: run.conversationId,
      role: "assistant",
      content,
      error,
      createdAt: this.ports.now(),
      toolCalls,
    };
    this.ports.messages.insert(message);
    run.events.message(presentMessage(message, this.kindOf));
  }

  private context(
    run: Pick<LoopRun, "conversationId" | "user" | "signal">,
  ): ToolContext {
    return {
      user: run.user,
      origin: { conversationId: run.conversationId },
      signal: run.signal,
    };
  }

  private present(call: StoredToolCall): AssistantToolCall {
    return presentToolCall(call, this.kindOf);
  }

  private readonly kindOf = (name: string) =>
    this.ports.tools.get(name)?.kind ?? "read";
}
