export interface ModelCaps {
  vision: boolean | null;
  reasoning: boolean | null;
  /** Reasoning cannot be switched off, only hidden */
  reasoningMandatory: boolean;
  contextWindow: number | null;
}

export const UNKNOWN_CAPS: ModelCaps = {
  vision: null,
  reasoning: null,
  reasoningMandatory: false,
  contextWindow: null,
};

// OpenRouter, Groq, Mistral and LM Studio each name the window differently
const CONTEXT_FIELDS = ["context_length", "context_window", "max_context_length"];

const positive = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;

function contextOf(entry: Record<string, unknown>): number | null {
  for (const field of CONTEXT_FIELDS) {
    const value = positive(entry[field]);
    if (value) return value;
  }
  return positive(record(entry.top_provider)?.context_length);
}

const REASONING_PARAMS = ["reasoning", "include_reasoning", "reasoning_effort"];

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const strings = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;

/** What a models list entry says the model can do, each provider spells the fields its own way */
export function capsFromEntry(entry: Record<string, unknown>): ModelCaps {
  const capabilities = record(entry.capabilities);
  const inputs =
    strings(record(entry.architecture)?.input_modalities) ??
    strings(entry.input_modalities) ??
    strings(record(entry.modalities)?.input) ??
    strings(capabilities?.input);

  const params = strings(entry.supported_parameters);
  const reasoningInfo = record(entry.reasoning);
  let reasoning: boolean | null = null;
  if (typeof capabilities?.reasoning === "boolean")
    reasoning = capabilities.reasoning;
  else if (reasoningInfo) reasoning = true;
  else if (params)
    reasoning = params.some((param) => REASONING_PARAMS.includes(param));

  return {
    vision: inputs ? inputs.includes("image") : null,
    reasoning,
    reasoningMandatory: reasoningInfo?.mandatory === true,
    contextWindow: contextOf(entry),
  };
}
