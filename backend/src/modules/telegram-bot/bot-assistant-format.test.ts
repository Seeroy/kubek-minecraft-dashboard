import { describe, expect, it } from "bun:test";
import type { AssistantToolCall } from "@shared/types/assistant.types";
import {
  chunkText,
  lineDiff,
  renderConfirmCard,
  renderPlanCard,
  renderQuestionCard,
  renderToolLines,
} from "./bot-assistant-format";

const call = (patch: Partial<AssistantToolCall>): AssistantToolCall => ({
  id: "c",
  name: "read_file",
  args: {},
  kind: "read",
  status: "done",
  serverId: null,
  result: null,
  preview: null,
  ...patch,
});

describe("bot assistant format", () => {
  it("lists calls with status icons and localized names", () => {
    const text = renderToolLines("ru", [
      call({ status: "done" }),
      call({ id: "d", name: "unknown_tool", status: "error" }),
    ]);
    expect(text).toContain("✅ Чтение файла");
    expect(text).toContain("❌ unknown_tool");
  });

  it("folds plan updates into one progress line and hides questions", () => {
    const steps = (done: number) =>
      ["a", "b", "c"].map((text, i) => ({ text, status: i < done ? "done" : "pending" }));
    const text = renderToolLines("en", [
      call({}),
      call({ id: "p1", name: "update_plan", kind: "plan", args: { title: "Fix <lag>", steps: steps(1) } }),
      call({ id: "p2", name: "update_plan", kind: "plan", args: { title: "Fix <lag>", steps: steps(2) } }),
      call({ id: "q", name: "ask_user", kind: "ask", status: "pending" }),
    ]);
    expect(text?.split("\n")).toEqual(["<b>🛠 Actions</b>", "✅ Read file", "📋 Fix &lt;lag&gt;: 2/3"]);
    expect(renderToolLines("en", [call({ name: "ask_user", kind: "ask" })])).toBeNull();
  });

  it("renders plan and question cards", () => {
    const plan = renderPlanCard("ru", {
      title: "План",
      steps: [{ text: "Бэкап", status: "pending" }],
    });
    expect(plan).toContain("▫️ 1. Бэкап");
    const question = renderQuestionCard("en", {
      question: "Which <one>?",
      options: [{ label: "Lobby", description: "hub" }],
    });
    expect(question).toContain("Which &lt;one&gt;?");
    expect(question).toContain("1. <b>Lobby</b>: hub");
  });

  it("shows only the changed lines of an edit", () => {
    expect(lineDiff("a\nb\nc", "a\nx\nc")).toBe("- b\n+ x");
    expect(lineDiff("a", "a\nb")).toBe("+ b");
  });

  it("escapes previews in the confirmation card", () => {
    const card = renderConfirmCard(
      "en",
      call({ name: "send_command", kind: "write", status: "pending", preview: { type: "command", command: "say <hi>" } }),
      "Lobby",
    );
    expect(card).toContain("<pre>say &lt;hi&gt;</pre>");
    expect(card).toContain("<b>Lobby</b>");
  });

  it("splits long text on line breaks", () => {
    const text = `${"a".repeat(60)}\n${"b".repeat(60)}`;
    expect(chunkText(text, 100)).toEqual(["a".repeat(60), "b".repeat(60)]);
    expect(chunkText("x".repeat(250), 100).map((part) => part.length)).toEqual([100, 100, 50]);
  });
});
