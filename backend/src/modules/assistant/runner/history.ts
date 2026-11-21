import {
  ASSISTANT_ASK_TOOL,
  ASSISTANT_PLAN_TOOL,
  type AssistantPlan,
} from "@shared/types/assistant.types";
import type { ChatContentPart, ChatMessage } from "../llm/llm.types";
import { planArgs } from "../tools/chat.tools";
import type {
  StoredMessage,
  StoredToolCall,
} from "../conversations/messages.repository";
import { redactSecrets } from "./redact";

export const DECLINED = "The user declined this action";

// Images are the priciest input, older ones are left out after this many messages
const IMAGE_MESSAGES = 2;

export interface HistoryOptions {
  /** The model reads images, otherwise they become a note */
  vision: boolean;
  /**
   * DeepSeek rejects a request with tools unless every earlier answer carries
   * reasoning_content, even answers saved without one
   */
  requireReasoning?: boolean;
}

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
export function buildHistory(
  messages: StoredMessage[],
  options: HistoryOptions = { vision: false },
): ChatMessage[] {
  const withImages = messages.filter((message) =>
    message.attachments?.some((file) => file.kind === "image"),
  );
  const showImages = new Set(withImages.slice(-IMAGE_MESSAGES));
  const out: ChatMessage[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      out.push(userMessage(message, options.vision && showImages.has(message)));
      continue;
    }
    if (!message.content && !message.toolCalls.length) continue;
    const replay =
      options.requireReasoning && !(message.replay && "reasoning_content" in message.replay)
        ? { ...message.replay, reasoning_content: message.reasoning ?? "" }
        : message.replay;
    out.push({
      role: "assistant",
      ...replay,
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

// Text files go inline, images as parts when the model gets to see them
function userMessage(message: StoredMessage, images: boolean): ChatMessage {
  const files = message.attachments ?? [];
  let text = message.content;
  const parts: ChatContentPart[] = [];
  for (const file of files) {
    if (file.kind === "text") {
      const body = redactSecrets(file.data.toString("utf8"));
      text += `\n\n<file name="${file.name}">\n${body}\n</file>`;
    } else if (images) {
      parts.push({
        type: "image_url",
        image_url: { url: `data:${file.mime};base64,${file.data.toString("base64")}` },
      });
    } else {
      text += `\n\n[Image ${file.name} is attached but not shown to the model]`;
    }
  }
  if (!parts.length) return { role: "user", content: text };
  return { role: "user", content: [{ type: "text", text }, ...parts] };
}

// Only plans and questions that went to the user carry a preview, status updates do not
const answeredByUser = (call: StoredToolCall) =>
  (call.name === ASSISTANT_PLAN_TOOL || call.name === ASSISTANT_ASK_TOOL) &&
  call.preview !== null &&
  (call.status === "done" || call.status === "rejected");

/** Model turns since the user last wrote, an approved plan or an answered question counts as writing */
export function stepsSinceUser(messages: StoredMessage[]): number {
  let steps = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "user" || message.toolCalls.some(answeredByUser)) break;
    steps++;
  }
  return steps;
}

/** Steps of the plan the user last approved, with the latest statuses */
export function approvedPlan(messages: StoredMessage[]): AssistantPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const calls = messages[i].toolCalls;
    for (let j = calls.length - 1; j >= 0; j--) {
      const call = calls[j];
      if (call.name !== ASSISTANT_PLAN_TOOL) continue;
      // A declined or pending plan voids the older one, a malformed call does not
      if (call.status === "error") continue;
      if (call.status !== "done") return null;
      const parsed = planArgs.safeParse(call.args);
      if (parsed.success) return parsed.data;
    }
  }
  return null;
}

export function hasPending(messages: StoredMessage[]): boolean {
  const last = messages[messages.length - 1];
  return !!last?.toolCalls.some((call) => call.status === "pending");
}
