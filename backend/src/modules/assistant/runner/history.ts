import type { ChatMessage } from "../llm/llm.types";
import type {
  StoredMessage,
  StoredToolCall,
} from "../conversations/messages.repository";

export const DECLINED = "The user declined this action";

/** What the model reads back as the result of a call */
export function toolResultText(call: StoredToolCall): string {
  switch (call.status) {
    case "done":
      return call.result ?? "";
    case "rejected":
      return call.result ?? DECLINED;
    case "error":
      return `Error: ${call.result ?? "unknown error"}`;
    default:
      return "Error: the call did not finish";
  }
}

/** Provider messages rebuilt from the stored conversation */
export function buildHistory(messages: StoredMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      out.push({ role: "user", content: message.content });
      continue;
    }
    if (!message.content && !message.toolCalls.length) continue;
    out.push({
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.length
        ? message.toolCalls.map((call) => ({
            id: call.id,
            type: "function",
            function: { name: call.name, arguments: JSON.stringify(call.args) },
          }))
        : undefined,
    });
    for (const call of message.toolCalls) {
      out.push({
        role: "tool",
        tool_call_id: call.id,
        content: toolResultText(call),
      });
    }
  }
  return out;
}

/** Model turns since the user last wrote */
export function stepsSinceUser(messages: StoredMessage[]): number {
  let steps = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") break;
    steps++;
  }
  return steps;
}

export function hasPending(messages: StoredMessage[]): boolean {
  const last = messages[messages.length - 1];
  return !!last?.toolCalls.some((call) => call.status === "pending");
}
