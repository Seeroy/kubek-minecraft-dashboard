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

/** Whether the model reads images, auto trusts the provider's model list */
export type AssistantVisionMode = "auto" | "on" | "off";

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
  /** USD per million prompt tokens served from the provider cache, 0 bills them as input */
  priceCache: number;
  vision: AssistantVisionMode;
}

/** Reasoning asked of the model, auto sends nothing and keeps the provider default */
export type AssistantReasoningLevel = "auto" | "off" | "low" | "medium" | "high";

export const ASSISTANT_REASONING_LEVELS: readonly AssistantReasoningLevel[] = [
  "auto",
  "off",
  "low",
  "medium",
  "high",
];

/** What the configured model can do, null when the provider does not say */
export interface AssistantCapabilities {
  vision: boolean | null;
  reasoning: boolean | null;
  /** The provider has a web search the panel knows how to drive */
  webSearch: boolean;
  /** Context window in tokens, null when the provider does not list it */
  contextWindow: number | null;
}

/** Limits the composer checks before sending, the server checks them again */
export const ASSISTANT_ATTACHMENT_LIMITS = {
  count: 6,
  images: 4,
  /** Base64 length of one image */
  imageChars: 3_000_000,
  /** Characters of one text file */
  textChars: 200_000,
} as const;

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

/** A model the provider serves, name only when the provider gives a readable one */
export interface AssistantModelInfo {
  id: string;
  name: string | null;
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
  pricing: { input: number; output: number; cache: number } | null;
  /** Rubles per dollar from the Central Bank, null when it could not be fetched */
  usdRub: number | null;
  capabilities: AssistantCapabilities;
}

/** Tokens of one model request and what it cost */
export interface AssistantUsage {
  promptTokens: number;
  completionTokens: number;
  /** Part of the prompt the provider took from its cache, missing when it did not say */
  cachedTokens?: number;
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

/** Plan and ask are answered by the user in the chat, they never reach MCP */
export type AssistantToolKind = "read" | "write" | "plan" | "ask";

export const ASSISTANT_PLAN_TOOL = "update_plan";
export const ASSISTANT_ASK_TOOL = "ask_user";

export type AssistantPlanStepStatus = "pending" | "in_progress" | "done" | "skipped";

export interface AssistantPlanStep {
  text: string;
  status: AssistantPlanStepStatus;
}

/** Arguments of update_plan */
export interface AssistantPlan {
  /** Models often leave it out on status updates, the approved plan's title stays */
  title?: string;
  explanation?: string;
  steps: AssistantPlanStep[];
}

export interface AssistantQuestionOption {
  label: string;
  description?: string;
}

/** Arguments of ask_user */
export interface AssistantQuestion {
  question: string;
  options?: AssistantQuestionOption[];
  multiple?: boolean;
}

/** What the user sent back for a question, also the call result as JSON */
export interface AssistantQuestionAnswer {
  selected: string[];
  text: string | null;
}

/** Extra input with a decision: the answer to a question or feedback on a declined plan */
export interface AssistantCallResponse {
  selected?: string[];
  text?: string;
}

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

export type AssistantAttachmentKind = "image" | "text";

export interface AssistantAttachment {
  id: string;
  kind: AssistantAttachmentKind;
  name: string;
  mime: string;
  /** Bytes of the stored file */
  size: number;
}

/** A file sent with a message, images as base64 without the data: prefix */
export interface AssistantAttachmentInput {
  kind: AssistantAttachmentKind;
  name: string;
  mime: string;
  data: string;
}

/** Web page the answer is based on */
export interface AssistantSource {
  url: string;
  title: string | null;
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
  attachments: AssistantAttachment[];
  /** Thinking the model showed before answering */
  reasoning: string | null;
  reasoningMs: number | null;
  sources: AssistantSource[];
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

/** Per run choices from the composer, they also apply when a confirmed call resumes the run */
export interface AssistantRunOptions {
  autoApprove?: boolean;
  reasoning?: AssistantReasoningLevel;
  webSearch?: boolean;
}

export interface AssistantSendResult {
  conversation: IAssistantConversation;
  message: IAssistantMessage;
}
