import { describe, expect, it } from "bun:test";
import { AssistantEventsService } from "@/modules/assistant/runner/assistant-events.service";
import { BotAssistantService } from "./bot-assistant.service";

const call = {
  id: "call1",
  name: "power",
  args: {},
  kind: "write" as const,
  status: "pending" as const,
  serverId: "s",
  result: null,
  preview: { type: "summary" as const, title: "Start", lines: [] },
};

function setup(assistant?: boolean) {
  const bus = new AssistantEventsService();
  const calls: { method: string; args: unknown[] }[] = [];
  const service = new BotAssistantService(
    { send: () => ({ conversation: { id: "conv" } }) } as never,
    bus,
    { isConfigured: () => true } as never,
    { getUser: () => ({ id: "u", isAdmin: true }) } as never,
    { findById: () => ({ name: "Lobby" }) } as never,
    { get: () => ({ enabled: true, assistant }) } as never,
  );
  // Every Bot API method is recorded and succeeds
  const api = new Proxy(
    {},
    {
      get: (_target, method) => (...args: unknown[]) => {
        calls.push({ method: String(method), args });
        return Promise.resolve({ message_id: calls.length });
      },
    },
  );
  service.setBot({ api, token: "t" } as never);
  return { bus, calls, service };
}

describe("BotAssistantService", () => {
  it("ignores messages when the assistant is off in the bot settings", async () => {
    const { calls, service } = setup(false);
    const handled = await service.handleMessage(
      { chat: { id: 5 }, reply: () => Promise.resolve() } as never,
      "en",
      { id: 1, userId: "u" } as never,
      { text: "hi", messageId: 1 },
    );
    expect(handled).toBe(false);
    expect(service.userFor({ id: 1, userId: "u" } as never)).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("sends one thinking placeholder and then the confirmation card", async () => {
    const { bus, calls, service } = setup();
    await service.handleMessage(
      { chat: { id: 5 }, reply: () => Promise.resolve() } as never,
      "en",
      { id: 5, userId: "u" } as never,
      { text: "start it", messageId: 9 },
    );
    for (let i = 0; i < 50; i++)
      bus.emit("conv", { type: "delta", messageId: "m1", text: "hmm", channel: "reasoning" });
    bus.emit("conv", {
      type: "message",
      message: { id: "m1", role: "assistant", content: "", toolCalls: [call], error: null } as never,
    });
    bus.emit("conv", { type: "confirm", messageId: "m1", call });
    bus.emit("conv", { type: "done", finished: false });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(calls.filter((c) => c.method === "sendMessageDraft")).toHaveLength(0);
    const card = calls.find((c) => c.method === "sendMessage" && JSON.stringify(c.args).includes("ai:y:call1"));
    expect(card).toBeDefined();
  });
});
