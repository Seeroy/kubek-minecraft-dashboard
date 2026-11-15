import { describe, expect, it } from "bun:test";
import type { AssistantToolCall } from "@shared/types/assistant.types";
import {
  chunkText,
  lineDiff,
  renderConfirmCard,
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
