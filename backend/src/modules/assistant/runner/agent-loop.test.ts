import { describe, expect, it } from "bun:test";
import { testUser } from "@/testing/user";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import type { ChatCompletion, ChatRequest } from "../llm/llm.types";
import type {
  StoredMessage,
  ToolCallPatch,
} from "../conversations/messages.repository";
import { toToolSpec } from "../tools/tool-schema";
import { type AssistantTool, defineTool } from "../tools/tool.types";
import { AgentLoop, type LoopEvents, STEP_LIMIT, STOPPED } from "./agent-loop";
import { DECLINED } from "./history";

const user = testUser("u", { username: "steve", isAdmin: true });

const echo = defineTool({
  name: "echo",
  description: "Echo",
  kind: "read",
  access: "serverView",
  serverScoped: false,
  args: z.object({ text: z.string() }),
  run: (_ctx, { text }) => Promise.resolve({ content: `echo ${text}` }),
});

const written: string[] = [];
const write = defineTool({
  name: "write",
  description: "Write",
  kind: "write",
  access: [AccessArea.FILES, "write"],
  serverScoped: false,
  args: z.object({ text: z.string() }),
  preview: (_ctx, { text }) =>
    Promise.resolve({ type: "command", command: text }),
  run: (_ctx, { text }) => {
    written.push(text);
    return Promise.resolve({ content: "written" });
  },
});

const TOOLS: Record<string, AssistantTool> = { echo, write };

type Reply = ChatCompletion | Error;

const answer = (content: string): ChatCompletion => ({
  content,
  toolCalls: [],
  finishReason: "stop",
});
const callTool = (name: string, args: unknown): ChatCompletion => ({
  content: "",
  toolCalls: [
    {
      id: "provider-id",
      name,
      arguments: typeof args === "string" ? args : JSON.stringify(args),
    },
  ],
  finishReason: "tool_calls",
});

function harness(replies: Reply[], maxSteps = 8) {
  const store: StoredMessage[] = [
    {
      id: "m0",
      conversationId: "c",
      role: "user",
      content: "hi",
      error: null,
      createdAt: 0,
      toolCalls: [],
    },
  ];
  const requests: ChatRequest[] = [];
  const log: string[] = [];
  let id = 0;
  const loop = new AgentLoop({
    complete: (req, _signal, onText) => {
      requests.push(structuredClone(req));
      const reply = replies.shift();
      if (!reply) throw new Error("no more replies");
      if (reply instanceof Error) return Promise.reject(reply);
      if (reply.content) onText(reply.content);
      return Promise.resolve(reply);
    },
    messages: {
      list: () => structuredClone(store),
      insert: (message) => void store.push(structuredClone(message)),
      updateToolCall: (callId: string, patch: ToolCallPatch) => {
        for (const m of store)
          for (const c of m.toolCalls)
            if (c.id === callId) Object.assign(c, patch);
      },
    },
    tools: {
      specs: () => Object.values(TOOLS).map(toToolSpec),
      get: (name) => TOOLS[name],
      denyReason: () => null,
      preview: (ctx, tool, args) => tool.preview!(ctx, args),
      execute: (ctx, tool, args) => tool.run(ctx, args),
    },
    newId: () => `id${++id}`,
    now: () => 1,
  });
  const events: LoopEvents = {
    delta: (_m, text) => log.push(`delta:${text}`),
    message: (m) =>
      log.push(`message:${m.toolCalls.map((c) => c.status).join(",")}`),
    tool: (_m, call) => log.push(`tool:${call.name}:${call.status}`),
    confirm: (_m, call) => log.push(`confirm:${call.name}`),
    done: (finished) => log.push(`done:${finished}`),
    error: (error) => log.push(`error:${error}`),
  };
  const controller = new AbortController();
  const run = {
    conversationId: "c",
    user,
    systemPrompt: "sys",
    model: "m",
    temperature: 0,
    maxSteps,
    signal: controller.signal,
    events,
  };
  return { loop, run, store, requests, log, controller };
}

describe("AgentLoop", () => {
  it("streams a plain answer", async () => {
    const h = harness([answer("Hello")]);
    await h.loop.run(h.run);
    expect(h.log).toEqual(["delta:Hello", "message:", "done:true"]);
    expect(h.store[1]).toMatchObject({
      role: "assistant",
      content: "Hello",
      error: null,
    });
    expect(h.requests[0].messages[0]).toEqual({
      role: "system",
      content: "sys",
    });
  });

  it("runs read tools right away and feeds results back", async () => {
    const h = harness([callTool("echo", { text: "x" }), answer("done")]);
    await h.loop.run(h.run);
    expect(h.log).toEqual([
      "message:running",
      "tool:echo:done",
      "delta:done",
      "message:",
      "done:true",
    ]);
    const second = h.requests[1].messages;
    const assistant = second[2] as { tool_calls: { id: string }[] };
    // Panel ids replace the provider ones
    expect(assistant.tool_calls[0].id).toBe("id2");
    expect(second[3]).toEqual({
      role: "tool",
      tool_call_id: "id2",
      content: "echo x",
    });
  });

  it("pauses on a write tool until it is approved", async () => {
    written.length = 0;
    const h = harness([callTool("write", { text: "op steve" }), answer("ok")]);
    await h.loop.run(h.run);
    expect(h.log).toEqual(["message:pending", "confirm:write", "done:false"]);
    expect(h.store[1].toolCalls[0].preview).toEqual({
      type: "command",
      command: "op steve",
    });

    // Resuming while still pending does not call the model
    await h.loop.run(h.run);
    expect(h.requests).toHaveLength(1);

    const call = h.store[1].toolCalls[0];
    await h.loop.decide(h.run, call, true);
    expect(written).toEqual(["op steve"]);
    await h.loop.run(h.run);
    expect(h.requests[1].messages[3]).toMatchObject({
      role: "tool",
      content: "written",
    });
    expect(h.log.slice(3)).toEqual([
      "done:false",
      "tool:write:running",
      "tool:write:done",
      "delta:ok",
      "message:",
      "done:true",
    ]);
  });

  it("tells the model when the user declines", async () => {
    written.length = 0;
    const h = harness([callTool("write", { text: "stop" }), answer("fine")]);
    await h.loop.run(h.run);
    await h.loop.decide(h.run, h.store[1].toolCalls[0], false);
    await h.loop.run(h.run);
    expect(written).toEqual([]);
    expect(h.store[1].toolCalls[0].status).toBe("rejected");
    expect(h.requests[1].messages[3]).toMatchObject({
      role: "tool",
      content: DECLINED,
    });
  });

  it("returns unknown tools and bad arguments to the model as errors", async () => {
    const h = harness([
      callTool("nope", {}),
      callTool("echo", "{bad"),
      answer("sorry"),
    ]);
    await h.loop.run(h.run);
    expect(h.requests[1].messages[3]).toMatchObject({
      content: "Error: Unknown tool nope",
    });
    expect(h.requests[2].messages[5]).toMatchObject({
      content: "Error: Arguments are not valid JSON",
    });
    expect(h.log.at(-1)).toBe("done:true");
  });

  it("stops at the step limit", async () => {
    const h = harness(
      [callTool("echo", { text: "1" }), callTool("echo", { text: "2" })],
      2,
    );
    await h.loop.run(h.run);
    expect(h.requests).toHaveLength(2);
    expect(h.store.at(-1)).toMatchObject({ error: STEP_LIMIT });
    expect(h.log.at(-1)).toBe("done:true");
  });

  it("keeps partial text when the provider fails", async () => {
    const h = harness([new Error("Provider responded 500")]);
    await h.loop.run(h.run);
    expect(h.store[1]).toMatchObject({
      role: "assistant",
      error: "Provider responded 500",
    });
    expect(h.log.at(-1)).toBe("error:Provider responded 500");
  });

  it("marks a stopped run", async () => {
    const h = harness([new Error("aborted")]);
    h.controller.abort();
    await h.loop.run(h.run);
    expect(h.store[1].error).toBe(STOPPED);
    expect(h.log.at(-1)).toBe("done:true");
  });
});
