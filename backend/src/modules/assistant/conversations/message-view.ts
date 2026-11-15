import type {
  AssistantToolCall,
  AssistantToolKind,
  IAssistantMessage,
} from "@shared/types/assistant.types";
import { serverIdOf } from "../tools/tool-access";
import type { StoredMessage, StoredToolCall } from "./messages.repository";

export type KindOf = (toolName: string) => AssistantToolKind;

export function presentToolCall(
  call: StoredToolCall,
  kindOf: KindOf,
): AssistantToolCall {
  return {
    id: call.id,
    name: call.name,
    args: call.args,
    kind: kindOf(call.name),
    status: call.status,
    serverId: serverIdOf(call.args),
    result: call.result,
    preview: call.preview,
  };
}

export function presentMessage(
  message: StoredMessage,
  kindOf: KindOf,
): IAssistantMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    status: message.error ? "error" : "done",
    error: message.error,
    toolCalls: message.toolCalls.map((call) => presentToolCall(call, kindOf)),
    createdAt: message.createdAt,
    usage: message.usage ?? null,
    attachments: (message.attachments ?? []).map((file) => ({
      id: file.id,
      kind: file.kind,
      name: file.name,
      mime: file.mime,
      size: file.data.length,
    })),
    reasoning: message.reasoning || null,
    reasoningMs: message.reasoningMs ?? null,
    sources: message.sources ?? [],
  };
}
