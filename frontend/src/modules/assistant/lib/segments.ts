import type { AssistantToolCall, AssistantUsage, IAssistantMessage } from "@shared/types/assistant.types";
import { addUsage } from "./usage";

type Billed = { usage: AssistantUsage | null };

export type ChatSegment =
  | { kind: "user"; key: string; message: IAssistantMessage }
  | { kind: "reasoning"; key: string; text: string; ms: number | null }
  | ({ kind: "text"; key: string; message: IAssistantMessage } & Billed)
  | ({ kind: "calls"; key: string; calls: AssistantToolCall[] } & Billed)
  | { kind: "confirm"; key: string; message: IAssistantMessage; call: AssistantToolCall }
  | ({ kind: "error"; key: string; error: string } & Billed);

/** Flattens messages into blocks, back to back tool calls end up in one group even across messages */
export function toSegments(messages: IAssistantMessage[]): ChatSegment[] {
  const out: ChatSegment[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      out.push({ kind: "user", key: message.id, message });
      continue;
    }
    // The request's cost goes under the last block this message produced
    let billed: Billed | null = null;
    if (message.reasoning) out.push({ kind: "reasoning", key: `${message.id}:reasoning`, text: message.reasoning, ms: message.reasoningMs });
    if (message.content) {
      const text: ChatSegment = { kind: "text", key: message.id, message, usage: null };
      out.push(text);
      billed = text;
    }
    for (const call of message.toolCalls) {
      if (call.status === "pending") {
        out.push({ kind: "confirm", key: call.id, message, call });
        continue;
      }
      const last = out.at(-1);
      if (last?.kind === "calls") {
        last.calls.push(call);
        billed = last;
      } else {
        const calls: ChatSegment = { kind: "calls", key: call.id, calls: [call], usage: null };
        out.push(calls);
        billed = calls;
      }
    }
    if (message.error) {
      const error: ChatSegment = { kind: "error", key: `${message.id}:error`, error: message.error, usage: null };
      out.push(error);
      billed = error;
    }
    if (billed) billed.usage = addUsage(billed.usage, message.usage);
  }
  return out;
}
