import type { SecretHint } from "./secret.types";

export type AssistantPresetId =
  | "ollama"
  | "lmstudio"
  | "openrouter"
  | "groq"
  | "gemini"
  | "mistral"
  | "deepseek"
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
  /** USD per million prompt tokens, 0 when unknown */
  priceInput: number;
  /** USD per million completion tokens, 0 when unknown */
  priceOutput: number;
}

/** Fixed message errors the run writes, the UI translates them */
export const ASSISTANT_RUN_ERRORS = {
  stopped: "Stopped",
  stepLimit: "Step limit reached, send a message to continue",
} as const;

/** Allowed tool rounds per answer */
export const ASSISTANT_STEPS = { min: 1, max: 100, default: 24 } as const;

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
  /** Runs on the panel host or the local network, so it costs nothing */
  local: boolean;
  /** Configured prices, null when not set */
  pricing: { input: number; output: number } | null;
  /** Rubles per dollar from the Central Bank, null when it could not be fetched */
  usdRub: number | null;
}

/** Tokens of one model request and what it cost */
export interface AssistantUsage {
  promptTokens: number;
  completionTokens: number;
  /** Exact cost from the provider or one from the configured prices, null when unknown */
  costUsd: number | null;
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
  /** Set on assistant messages when the provider reported usage */
  usage: AssistantUsage | null;
}

export interface AssistantConversationDetail {
  conversation: IAssistantConversation;
  messages: IAssistantMessage[];
  running: boolean;
}

/** Page or entity the user is looking at when sending a message */
export interface AssistantMessageContext {
  serverId?: string;
  /** Run write tools without asking */
  autoApprove?: boolean;
}

export interface AssistantSendResult {
  conversation: IAssistantConversation;
  message: IAssistantMessage;
}
