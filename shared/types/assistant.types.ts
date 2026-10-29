import type { SecretHint } from "./secret.types";

export type AssistantPresetId =
  | "ollama"
  | "lmstudio"
  | "openrouter"
  | "groq"
  | "gemini"
  | "mistral"
  | "openai"
  | "custom";

/** A known OpenAI compatible provider, the model list always comes from the provider */
export interface AssistantPreset {
  id: AssistantPresetId;
  label: string;
  baseUrl: string;
  /** Local servers usually run without a key */
  requiresKey: boolean;
  /** Placeholder for the model field, not a default */
  modelHint: string;
  /** True for providers that run on the panel host or the local network */
  local: boolean;
}

export interface AssistantSettings {
  enabled: boolean;
  preset: AssistantPresetId;
  baseUrl: string;
  model: string;
  temperature: number;
  maxSteps: number;
}

export interface AssistantSettingsView extends AssistantSettings {
  apiKey: SecretHint;
}

/** A blank or missing apiKey keeps the stored key, null clears it */
export interface AssistantSettingsUpdate extends Partial<AssistantSettings> {
  apiKey?: string | null;
}

/** Connection being edited in the settings form, a blank key falls back to the stored one */
export interface AssistantConnectionDraft {
  baseUrl: string;
  apiKey?: string;
  model?: string;
}

export interface AssistantTestResult {
  ok: boolean;
  latencyMs: number;
  error: string | null;
}

/** What a user with the ai_assistant permission learns about the setup */
export interface AssistantStatus {
  enabled: boolean;
  configured: boolean;
  model: string | null;
  provider: string | null;
}

export interface IAssistantConversation {
  id: string;
  title: string;
  serverId: string | null;
  createdAt: number;
  updatedAt: number;
}

export type AssistantMessageRole = "user" | "assistant";

export type AssistantMessageStatus = "done" | "error";

export type AssistantToolKind = "read" | "write";

export type AssistantToolCallStatus =
  "pending" | "running" | "done" | "error" | "rejected";

export interface AssistantPropertyChange {
  key: string;
  before: string | null;
  after: string;
}

/** What the confirmation card shows before a write tool runs */
export type AssistantToolPreview =
  | {
      type: "diff";
      path: string;
      before: string;
      after: string;
      created: boolean;
    }
  | { type: "command"; command: string }
  | { type: "properties"; changes: AssistantPropertyChange[] }
  | { type: "summary"; title: string; lines: string[] };

export interface AssistantToolCall {
  /** Provider call id, unique within a conversation */
  id: string;
  name: string;
  args: Record<string, unknown>;
  kind: AssistantToolKind;
  status: AssistantToolCallStatus;
  serverId: string | null;
  result: string | null;
  preview: AssistantToolPreview | null;
}

export interface IAssistantMessage {
  id: string;
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
  status: AssistantMessageStatus;
  error: string | null;
  toolCalls: AssistantToolCall[];
  createdAt: number;
}

export interface AssistantConversationDetail {
  conversation: IAssistantConversation;
  messages: IAssistantMessage[];
  running: boolean;
}

/** Page or entity the user is looking at when sending a message */
export interface AssistantMessageContext {
  serverId?: string;
}

export interface AssistantSendResult {
  conversation: IAssistantConversation;
  message: IAssistantMessage;
}
