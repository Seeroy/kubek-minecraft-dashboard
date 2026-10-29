import type {
  AssistantPreset,
  AssistantPresetId,
} from "@shared/types/assistant.types";

// Model hints are placeholders only, the picker lists what the provider serves
export const ASSISTANT_PRESETS: AssistantPreset[] = [
  {
    id: "ollama",
    label: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    requiresKey: false,
    modelHint: "qwen3:8b",
    local: true,
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    baseUrl: "http://localhost:1234/v1",
    requiresKey: false,
    modelHint: "qwen/qwen3-8b",
    local: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresKey: true,
    modelHint: "openai/gpt-4.1-mini",
    local: false,
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresKey: true,
    modelHint: "llama-3.3-70b-versatile",
    local: false,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    requiresKey: true,
    modelHint: "gemini-2.5-flash",
    local: false,
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    requiresKey: true,
    modelHint: "mistral-small-latest",
    local: false,
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    requiresKey: true,
    modelHint: "gpt-4.1-mini",
    local: false,
  },
  {
    id: "custom",
    label: "Custom",
    baseUrl: "",
    requiresKey: false,
    modelHint: "",
    local: false,
  },
];

export const PRESET_IDS = ASSISTANT_PRESETS.map((preset) => preset.id);

export function findPreset(id: AssistantPresetId): AssistantPreset {
  return (
    ASSISTANT_PRESETS.find((preset) => preset.id === id) ??
    ASSISTANT_PRESETS[ASSISTANT_PRESETS.length - 1]
  );
}
