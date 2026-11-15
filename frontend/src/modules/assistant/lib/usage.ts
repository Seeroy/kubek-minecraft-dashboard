import type { AssistantStatus, AssistantUsage, IAssistantMessage } from "@shared/types/assistant.types";

/** Sums usage, the cost stays unknown if any part of it is */
export function addUsage(a: AssistantUsage | null, b: AssistantUsage | null): AssistantUsage | null {
  if (!a) return b;
  if (!b) return a;
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    cachedTokens: (a.cachedTokens ?? 0) + (b.cachedTokens ?? 0),
    costUsd: a.costUsd === null || b.costUsd === null ? null : a.costUsd + b.costUsd,
  };
}

export function totalUsage(messages: IAssistantMessage[]): AssistantUsage | null {
  return messages.reduce<AssistantUsage | null>((sum, message) => addUsage(sum, message.usage), null);
}

// Rough guess: context grows by the last answer, the reply is an average one
export function estimateNext(messages: IAssistantMessage[], pricing: AssistantStatus["pricing"]): AssistantUsage | null {
  const used = messages.flatMap((message) => (message.usage ? [message.usage] : []));
  const last = used.at(-1);
  if (!last) return null;
  const lastTokens = last.promptTokens + last.completionTokens;
  const completionTokens = Math.round(used.reduce((sum, u) => sum + u.completionTokens, 0) / used.length);
  const next = { promptTokens: lastTokens, completionTokens };
  if (pricing) {
    // With a cache price the context sent last time comes from the cache, only the last answer is new
    const cachedPrice = pricing.cache || pricing.input;
    const prompt = last.promptTokens * cachedPrice + last.completionTokens * pricing.input;
    return { ...next, costUsd: (prompt + completionTokens * pricing.output) / 1_000_000 };
  }
  // Without prices the last request's cost is scaled
  const costUsd = last.costUsd !== null && lastTokens > 0 ? (last.costUsd * (lastTokens + completionTokens)) / lastTokens : null;
  return { ...next, costUsd };
}
