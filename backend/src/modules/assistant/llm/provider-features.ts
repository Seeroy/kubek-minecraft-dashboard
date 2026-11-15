import type {
  AssistantPresetId,
  AssistantReasoningLevel,
} from "@shared/types/assistant.types";

/** Providers whose extensions the panel speaks, everything else gets plain OpenAI fields */
export type ProviderKind = "openrouter" | "deepseek" | "generic";

export function providerKind(
  preset: AssistantPresetId,
  baseUrl: string,
): ProviderKind {
  if (preset === "openrouter" || /openrouter\.ai/i.test(baseUrl))
    return "openrouter";
  if (preset === "deepseek" || /api\.deepseek\.com/i.test(baseUrl))
    return "deepseek";
  return "generic";
}

// DeepSeek knows low, high and max, its default is high
const DEEPSEEK_EFFORT = { low: "low", medium: "high", high: "max" } as const;

/** Request fields for the chosen reasoning, undefined keeps the provider default */
export function reasoningOptions(
  kind: ProviderKind,
  level: AssistantReasoningLevel,
  mandatory: boolean,
): Record<string, unknown> | undefined {
  if (level === "auto") return undefined;
  switch (kind) {
    case "openrouter":
      if (level !== "off") return { reasoning: { effort: level } };
      // A model that must think rejects effort none, it can only hide the text
      return { reasoning: mandatory ? { exclude: true } : { effort: "none" } };
    case "deepseek":
      return level === "off"
        ? { thinking: { type: "disabled" } }
        : {
            thinking: { type: "enabled" },
            reasoning_effort: DEEPSEEK_EFFORT[level],
          };
    default:
      return { reasoning_effort: level === "off" ? "none" : level };
  }
}

/** Search the provider runs on its side, DeepSeek search goes through panel tools instead */
export function webSearchServerTools(
  kind: ProviderKind,
): Record<string, unknown>[] {
  return kind === "openrouter"
    ? [{ type: "openrouter:web_search", parameters: { max_results: 5 } }]
    : [];
}

/** The panel can drive this provider's web search one way or another */
export const hasWebSearch = (kind: ProviderKind) => kind !== "generic";
