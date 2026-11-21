import { describe, expect, it } from "bun:test";
import { CompletionAccumulator } from "./completion-accumulator";
import { capsFromEntry } from "./model-caps";
import { providerKind, reasoningOptions } from "./provider-features";
import { ThinkSplitter } from "./think-splitter";

const delta = (value: Record<string, unknown>) => ({
  choices: [{ delta: value }],
});

describe("ThinkSplitter", () => {
  it("splits a leading think block even when tags are cut between chunks", () => {
    const splitter = new ThinkSplitter();
    const parts = ["<thi", "nk>plan", " it</th", "ink>\n\nAnswer"].map((chunk) =>
      splitter.push(chunk),
    );
    const flushed = splitter.flush();
    expect(parts.map((p) => p.reasoning).join("") + flushed.reasoning).toBe(
      "plan it",
    );
    expect(parts.map((p) => p.text).join("") + flushed.text).toBe("Answer");
  });

  it("leaves content without a think block alone", () => {
    const splitter = new ThinkSplitter();
    expect(splitter.push("Hello <think> is a tag").text).toBe(
      "Hello <think> is a tag",
    );
  });
});

describe("CompletionAccumulator reasoning", () => {
  it("keeps reasoning_content apart and replays it", () => {
    let clock = 0;
    const acc = new CompletionAccumulator(() => clock);
    acc.push(delta({ reasoning_content: "think" }));
    clock = 1500;
    acc.push(delta({ content: "done" }));
    const result = acc.result();
    expect(result.reasoning).toBe("think");
    expect(result.content).toBe("done");
    expect(result.reasoningMs).toBe(1500);
    expect(result.replay).toEqual({ reasoning_content: "think" });
  });

  it("glues streamed reasoning_details by index and shows the plain field once", () => {
    const acc = new CompletionAccumulator();
    acc.push(
      delta({
        reasoning: "a",
        reasoning_details: [{ type: "reasoning.text", index: 0, text: "a" }],
      }),
    );
    acc.push(
      delta({
        reasoning: "b",
        reasoning_details: [
          { type: "reasoning.text", index: 0, text: "b", signature: "sig" },
        ],
      }),
    );
    const result = acc.result();
    expect(result.reasoning).toBe("ab");
    expect(result.replay).toEqual({
      reasoning_details: [
        { type: "reasoning.text", index: 0, text: "ab", signature: "sig" },
      ],
    });
  });

  it("reads both citation shapes and drops duplicates", () => {
    const acc = new CompletionAccumulator();
    acc.push(
      delta({
        annotations: [
          { type: "url_citation", url_citation: { url: "https://a.dev", title: "A" } },
          { url: "https://b.dev", title: "https://b.dev" },
          { url: "https://a.dev" },
          { url: "javascript:alert(1)" },
        ],
      }),
    );
    expect(acc.result().sources).toEqual([
      { url: "https://a.dev", title: "A" },
      { url: "https://b.dev", title: null },
    ]);
  });
});

describe("capsFromEntry", () => {
  it("reads the OpenRouter shape", () => {
    expect(
      capsFromEntry({
        architecture: { input_modalities: ["text", "image"] },
        supported_parameters: ["tools", "reasoning"],
        reasoning: { mandatory: true },
        context_length: 200000,
      }),
    ).toEqual({
      vision: true,
      reasoning: true,
      reasoningMandatory: true,
      contextWindow: 200000,
    });
  });

  it("reads capabilities and modalities objects", () => {
    expect(
      capsFromEntry({ capabilities: { input: ["text"], reasoning: false } }),
    ).toEqual({
      vision: false,
      reasoning: false,
      reasoningMandatory: false,
      contextWindow: null,
    });
    expect(
      capsFromEntry({ top_provider: { context_length: 32768 } }).contextWindow,
    ).toBe(32768);
    expect(capsFromEntry({ modalities: { input: ["image"] } }).vision).toBe(
      true,
    );
  });

  it("knows nothing about bare ids", () => {
    expect(capsFromEntry({ id: "m" })).toEqual({
      vision: null,
      reasoning: null,
      reasoningMandatory: false,
      contextWindow: null,
    });
  });
});

describe("reasoningOptions", () => {
  it("sends nothing on auto", () => {
    expect(reasoningOptions("openrouter", "auto", false)).toBeUndefined();
  });

  it("maps levels per provider", () => {
    expect(reasoningOptions("openrouter", "low", false)).toEqual({
      reasoning: { effort: "low" },
    });
    expect(reasoningOptions("openrouter", "off", true)).toEqual({
      reasoning: { exclude: true },
    });
    expect(reasoningOptions("deepseek", "off", false)).toEqual({
      thinking: { type: "disabled" },
    });
    expect(reasoningOptions("deepseek", "medium", false)).toEqual({
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    });
    expect(reasoningOptions("generic", "off", false)).toEqual({
      reasoning_effort: "none",
    });
  });

  it("recognizes providers by preset or address", () => {
    expect(providerKind("custom", "https://openrouter.ai/api/v1")).toBe(
      "openrouter",
    );
    expect(providerKind("deepseek", "")).toBe("deepseek");
    expect(providerKind("ollama", "http://localhost:11434/v1")).toBe("generic");
  });
});
