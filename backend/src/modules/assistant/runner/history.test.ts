import { describe, expect, it } from "bun:test";
import type { StoredMessage } from "../conversations/messages.repository";
import { buildHistory } from "./history";

const image = (id: string) => ({
  id,
  kind: "image" as const,
  name: `${id}.png`,
  mime: "image/png",
  data: Buffer.from("png"),
});

const user = (id: string, extra: Partial<StoredMessage> = {}): StoredMessage => ({
  id,
  conversationId: "c",
  role: "user",
  content: "look",
  error: null,
  createdAt: 0,
  toolCalls: [],
  ...extra,
});

describe("buildHistory attachments", () => {
  it("inlines text files with secrets redacted", () => {
    const [message] = buildHistory([
      user("1", {
        attachments: [
          {
            id: "f",
            kind: "text",
            name: "server.properties",
            mime: "text/plain",
            data: Buffer.from("rcon.password=hunter2\nmotd=hi"),
          },
        ],
      }),
    ]);
    expect(message.content).toContain('<file name="server.properties">');
    expect(message.content).toContain("motd=hi");
    expect(message.content).not.toContain("hunter2");
  });

  it("sends only the latest images and notes the rest", () => {
    const history = buildHistory(
      [
        user("1", { attachments: [image("old")] }),
        user("2", { attachments: [image("mid")] }),
        user("3", { attachments: [image("new")] }),
      ],
      { vision: true },
    );
    expect(typeof history[0].content).toBe("string");
    expect(history[0].content).toContain("not shown to the model");
    expect(Array.isArray(history[1].content)).toBe(true);
    expect(Array.isArray(history[2].content)).toBe(true);
  });

  it("notes images when the model cannot see them", () => {
    const [message] = buildHistory([user("1", { attachments: [image("a")] })]);
    expect(message.content).toContain("[Image a.png");
  });

  it("hands reasoning back on assistant messages", () => {
    const history = buildHistory([
      {
        ...user("1"),
        role: "assistant",
        content: "ok",
        replay: { reasoning_content: "why" },
      },
    ]);
    expect(history[0]).toEqual({
      role: "assistant",
      reasoning_content: "why",
      content: "ok",
      tool_calls: undefined,
    });
  });
});
