import type { ChatCompletion, StreamedToolCall } from "./llm.types";

interface ChunkToolCall {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface ChunkChoice {
  delta?: { content?: string | null; tool_calls?: ChunkToolCall[] };
  finish_reason?: string | null;
}

/** Builds one completion from streamed chat.completion.chunk payloads */
export class CompletionAccumulator {
  private content = "";
  private finishReason: string | null = null;
  private readonly calls: StreamedToolCall[] = [];

  /** Applies one chunk, returns the text it added */
  push(chunk: unknown): string {
    const choice = (chunk as { choices?: ChunkChoice[] })?.choices?.[0];
    if (!choice) return "";
    if (choice.finish_reason) this.finishReason = choice.finish_reason;
    const text = choice.delta?.content ?? "";
    this.content += text;
    for (const part of choice.delta?.tool_calls ?? []) this.pushToolCall(part);
    return text;
  }

  result(): ChatCompletion {
    return {
      content: this.content,
      toolCalls: this.calls.filter((call) => call.name),
      finishReason: this.finishReason,
    };
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
