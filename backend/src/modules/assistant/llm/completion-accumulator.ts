import type {
  ChatCompletion,
  CompletionSource,
  CompletionUsage,
  ReasoningReplay,
  StreamedToolCall,
} from "./llm.types";
import { ThinkSplitter } from "./think-splitter";

interface ChunkToolCall {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface ChunkUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  // DeepSeek names it this way, OpenAI style providers use prompt_tokens_details
  prompt_cache_hit_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
}

type Detail = Record<string, unknown> & { index?: number; type?: string };

interface ChunkDelta {
  content?: string | null;
  tool_calls?: ChunkToolCall[];
  reasoning?: string | null;
  reasoning_content?: string | null;
  reasoning_details?: Detail[];
  annotations?: unknown[];
}

interface ChunkChoice {
  delta?: ChunkDelta;
  message?: { annotations?: unknown[] };
  finish_reason?: string | null;
}

/** Text a chunk added to the answer and to the thinking */
export interface ChunkText {
  text: string;
  reasoning: string;
}

// Streamed pieces of one reasoning_details entry are glued back by these fields
const DETAIL_TEXT_FIELDS = ["text", "summary", "data"] as const;

/** Builds one completion from streamed chat.completion.chunk payloads */
export class CompletionAccumulator {
  private content = "";
  private reasoning = "";
  private finishReason: string | null = null;
  private readonly calls: StreamedToolCall[] = [];
  private usage: CompletionUsage | null = null;
  private readonly details: Detail[] = [];
  // Only a reasoning_content field is worth sending back, think tags are not
  private reasoningContent = "";
  private readonly sources = new Map<string, CompletionSource>();
  private readonly think = new ThinkSplitter();
  private reasoningStart: number | null = null;
  private reasoningMs: number | null = null;

  constructor(private readonly now: () => number = Date.now) {}

  /** Applies one chunk, returns the text it added */
  push(chunk: unknown): ChunkText {
    // Usage comes in the last chunk, often with no choices at all
    const usage = (chunk as { usage?: ChunkUsage | null })?.usage;
    if (usage && typeof usage.prompt_tokens === "number") {
      this.usage = {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens ?? 0,
        cachedTokens:
          usage.prompt_cache_hit_tokens ??
          usage.prompt_tokens_details?.cached_tokens ??
          0,
        costUsd: typeof usage.cost === "number" ? usage.cost : null,
      };
    }
    const choice = (chunk as { choices?: ChunkChoice[] })?.choices?.[0];
    if (!choice) return { text: "", reasoning: "" };
    if (choice.finish_reason) this.finishReason = choice.finish_reason;
    const delta = choice.delta ?? {};

    for (const part of delta.tool_calls ?? []) this.pushToolCall(part);
    this.pushSources(delta.annotations);
    this.pushSources(choice.message?.annotations);

    let reasoning = this.pushReasoning(delta);
    const split = this.think.push(delta.content ?? "");
    reasoning += split.reasoning;
    return this.record(split.text, reasoning);
  }

  result(): ChatCompletion {
    const rest = this.think.flush();
    this.record(rest.text, rest.reasoning);
    if (this.reasoningStart !== null && this.reasoningMs === null)
      this.reasoningMs = this.now() - this.reasoningStart;
    return {
      content: this.content,
      toolCalls: this.calls.filter((call) => call.name),
      finishReason: this.finishReason,
      usage: this.usage,
      reasoning: this.reasoning,
      reasoningMs: this.reasoningMs,
      replay: this.replay(),
      sources: [...this.sources.values()],
    };
  }

  private record(text: string, reasoning: string): ChunkText {
    if (reasoning) {
      this.reasoningStart ??= this.now();
      this.reasoning += reasoning;
    }
    if (text) {
      // Thinking is over once the answer starts
      if (this.reasoningStart !== null && this.reasoningMs === null)
        this.reasoningMs = this.now() - this.reasoningStart;
      this.content += text;
    }
    return { text, reasoning };
  }

  // Providers name the field reasoning or reasoning_content, some only send reasoning_details
  private pushReasoning(delta: ChunkDelta): string {
    const details = Array.isArray(delta.reasoning_details)
      ? delta.reasoning_details
      : [];
    for (const detail of details) this.pushDetail(detail);

    if (typeof delta.reasoning_content === "string" && delta.reasoning_content) {
      this.reasoningContent += delta.reasoning_content;
      return delta.reasoning_content;
    }
    if (typeof delta.reasoning === "string" && delta.reasoning)
      return delta.reasoning;
    return details
      .map((detail) =>
        typeof detail.text === "string"
          ? detail.text
          : typeof detail.summary === "string"
            ? detail.summary
            : "",
      )
      .join("");
  }

  private pushDetail(detail: Detail): void {
    if (!detail || typeof detail !== "object") return;
    const same =
      typeof detail.index === "number"
        ? this.details.find(
            (item) => item.index === detail.index && item.type === detail.type,
          )
        : undefined;
    if (!same) {
      this.details.push({ ...detail });
      return;
    }
    for (const [key, value] of Object.entries(detail)) {
      const glued = (DETAIL_TEXT_FIELDS as readonly string[]).includes(key);
      if (glued && typeof value === "string" && typeof same[key] === "string")
        same[key] = (same[key] as string) + value;
      else if (value !== null && value !== undefined) same[key] = value;
    }
  }

  // Both the url_citation shape and a flat { url, title } one are in use
  private pushSources(annotations: unknown[] | undefined): void {
    if (!Array.isArray(annotations)) return;
    for (const item of annotations) {
      const entry = item as {
        url?: unknown;
        title?: unknown;
        url_citation?: { url?: unknown; title?: unknown };
      };
      const source = entry?.url_citation ?? entry;
      if (typeof source?.url !== "string" || !/^https?:\/\//i.test(source.url))
        continue;
      const title =
        typeof source.title === "string" && source.title !== source.url
          ? source.title
          : null;
      const known = this.sources.get(source.url);
      if (!known || (!known.title && title))
        this.sources.set(source.url, { url: source.url, title });
    }
  }

  private replay(): ReasoningReplay | null {
    if (this.details.length) return { reasoning_details: this.details };
    if (this.reasoningContent)
      return { reasoning_content: this.reasoningContent };
    return null;
  }

  // Some providers omit index and send each call whole, a new id starts a new call
  private pushToolCall(part: ChunkToolCall): void {
    let call =
      part.index !== undefined
        ? this.calls[part.index]
        : part.id
          ? this.calls.find((c) => c.id === part.id)
          : this.calls[this.calls.length - 1];
    if (!call) {
      call = { id: part.id ?? "", name: "", arguments: "" };
      if (part.index !== undefined) this.calls[part.index] = call;
      else this.calls.push(call);
    }
    if (part.id) call.id = part.id;
    // Some servers repeat the full name on every chunk
    const name = part.function?.name;
    if (name && name !== call.name) call.name += name;
    if (part.function?.arguments) call.arguments += part.function.arguments;
  }
}
