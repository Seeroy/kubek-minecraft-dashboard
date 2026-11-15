export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** Reasoning fields a provider wants back on its own assistant messages */
export type ReasoningReplay =
  | { reasoning_details: unknown[] }
  | { reasoning_content: string };

/** Chat message in the OpenAI chat/completions wire format */
export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | ChatContentPart[] }
  | ({
      role: "assistant";
      content: string | null;
      tool_calls?: ChatToolCall[];
    } & Partial<{ reasoning_details: unknown[]; reasoning_content: string }>)
  | { role: "tool"; tool_call_id: string; content: string };

export interface ChatToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ChatToolSpec[];
  /** Tools the provider runs itself, like its web search */
  serverTools?: Record<string, unknown>[];
  temperature?: number;
  /** Provider specific fields, dropped and retried once when the provider rejects them */
  options?: Record<string, unknown>;
}

/** Tool call as it arrives from the provider, arguments still raw */
export interface StreamedToolCall {
  id: string;
  name: string;
  arguments: string;
}

/** Tokens the provider reported, only OpenRouter adds the cost */
export interface CompletionUsage {
  promptTokens: number;
  completionTokens: number;
  /** Prompt tokens served from the provider cache, 0 when it did not say */
  cachedTokens: number;
  costUsd: number | null;
}

export interface CompletionSource {
  url: string;
  title: string | null;
}

export interface ChatCompletion {
  content: string;
  toolCalls: StreamedToolCall[];
  finishReason: string | null;
  usage: CompletionUsage | null;
  reasoning: string;
  /** Time from the first thought to the first answer token */
  reasoningMs: number | null;
  replay: ReasoningReplay | null;
  sources: CompletionSource[];
}

export interface LlmConnection {
  baseUrl: string;
  apiKey?: string;
}
