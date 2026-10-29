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
  };
}
