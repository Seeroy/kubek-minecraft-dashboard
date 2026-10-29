/** Chat message in the OpenAI chat/completions wire format */
export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ChatToolCall[];
    }
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
  temperature?: number;
}

/** Tool call as it arrives from the provider, arguments still raw */
export interface StreamedToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ChatCompletion {
  content: string;
  toolCalls: StreamedToolCall[];
  finishReason: string | null;
}

export interface LlmConnection {
  baseUrl: string;
  apiKey?: string;
}
