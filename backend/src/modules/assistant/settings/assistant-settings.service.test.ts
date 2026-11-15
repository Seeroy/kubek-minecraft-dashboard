import { describe, expect, it } from "bun:test";
import { AssistantSettingsService } from "./assistant-settings.service";

const service = (prices: Record<string, number>) =>
  new AssistantSettingsService({
    get: () => ({ preset: "deepseek", ...prices }),
    set: () => {},
  } as never);

const usage = { promptTokens: 1_000_000, completionTokens: 0, cachedTokens: 800_000, costUsd: null };

describe("AssistantSettingsService.costOf", () => {
  it("bills cached prompt tokens at the cache price", () => {
    const cost = service({ priceInput: 1, priceOutput: 2, priceCache: 0.1 }).costOf(usage);
    expect(cost).toBeCloseTo(0.2 + 0.08);
  });

  it("bills them as input when no cache price is set", () => {
    expect(service({ priceInput: 1, priceOutput: 2 }).costOf(usage)).toBeCloseTo(1);
  });
});
