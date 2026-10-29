import type { AssistantToolCall, IAssistantMessage } from "../assistant.types";

export enum WsAssistantEventTypes {
  DELTA = "assistant:delta",
  MESSAGE = "assistant:message",
  TOOL = "assistant:tool",
  CONFIRM = "assistant:confirm",
  DONE = "assistant:done",
  ERROR = "assistant:error",
}

export interface WsAssistantDelta {
  conversationId: string;
  messageId: string;
  text: string;
}

export interface WsAssistantMessage {
  conversationId: string;
  message: IAssistantMessage;
}

export interface WsAssistantTool {
  conversationId: string;
  messageId: string;
  call: AssistantToolCall;
}

export interface WsAssistantDone {
  conversationId: string;
  /** False while write calls wait for a decision */
  finished: boolean;
}

export interface WsAssistantError {
  conversationId: string;
  error: string;
}
