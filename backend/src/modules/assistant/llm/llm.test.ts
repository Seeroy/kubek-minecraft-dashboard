import { describe, expect, it } from "bun:test";
import { CompletionAccumulator } from "./completion-accumulator";
import { LlmClient, LlmError } from "./llm-client";
import { readSseData } from "./sse";

const encoder = new TextEncoder();

function chunks(...parts: string[]): AsyncIterable<Uint8Array> {
  return (async function* () {
    for (const part of parts) {
      await Promise.resolve();
      yield encoder.encode(part);
    }
  })();
}

async function collect(body: AsyncIterable<Uint8Array>) {
  const out: string[] = [];
  for await (const data of readSseData(body)) out.push(data);
  return out;
}

describe("readSseData", () => {
  it("splits events across chunk boundaries", async () => {
    const out = await collect(
      chunks('data: {"a"', ":1}\n\nda", "ta: [DONE]\n\n"),
    );
    expect(out).toEqual(['{"a":1}', "[DONE]"]);
  });

  it("handles CRLF, comments and multi line data", async () => {
    const out = await collect(
      chunks(": keep-alive\r\n\r\ndata: one\r", "\ndata: two\r\n\r\n"),
    );
    expect(out).toEqual(["one\ntwo"]);
  });

  it("flushes an event without a trailing blank line", async () => {
    expect(await collect(chunks("data: last"))).toEqual(["last"]);
  });

  it("ignores other fields", async () => {
    const out = await collect(chunks("event: ping\nid: 4\ndata:x\n\n"));
    expect(out).toEqual(["x"]);
  });
});

describe("CompletionAccumulator", () => {
  it("joins content and indexed tool call fragments", () => {
    const acc = new CompletionAccumulator();
    expect(acc.push({ choices: [{ delta: { content: "Hi" } }] })).toBe("Hi");
    acc.push({
      choices: [
        {
          delta: {
            tool_calls: [
              { index: 0, id: "a", function: { name: "read_file" } },
            ],
          },
        },
      ],
    });
    acc.push({
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '{"path":' } }],
          },
        },
      ],
    });
    acc.push({
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '"x"}' } }],
          },
          finish_reason: "tool_calls",
        },
      ],
    });
    expect(acc.result()).toEqual({
      content: "Hi",
      toolCalls: [{ id: "a", name: "read_file", arguments: '{"path":"x"}' }],
      finishReason: "tool_calls",
    });
  });

  it("accepts whole calls without index", () => {
    const acc = new CompletionAccumulator();
    const call = (id: string, name: string) => ({
      choices: [
        {
          delta: {
            tool_calls: [{ id, function: { name, arguments: "{}" } }],
          },
        },
      ],
    });
    acc.push(call("1", "list_servers"));
    acc.push(call("2", "get_server"));
    expect(acc.result().toolCalls.map((c) => c.name)).toEqual([
      "list_servers",
      "get_server",
    ]);
  });

  it("does not double a repeated name", () => {
    const acc = new CompletionAccumulator();
    const part = {
      choices: [
        { delta: { tool_calls: [{ index: 0, function: { name: "power" } }] } },
      ],
    };
    acc.push(part);
    acc.push(part);
    expect(acc.result().toolCalls[0].name).toBe("power");
  });
});

describe("LlmClient", () => {
  const sse = (...events: unknown[]) =>
    new Response(
      events
        .map(
          (e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`,
        )
        .join(""),
    );

  it("streams text and sends auth", async () => {
    let seen: RequestInit | undefined;
    const client = new LlmClient(
      { baseUrl: "http://llm/v1/", apiKey: "k" },
      (url, init) => {
        expect(url).toBe("http://llm/v1/chat/completions");
        seen = init;
        return Promise.resolve(
          sse(
            { choices: [{ delta: { content: "a" } }] },
            { choices: [{ delta: { content: "b" } }] },
            "[DONE]",
          ),
        );
      },
    );
    const texts: string[] = [];
    const result = await client.stream(
      { model: "m", messages: [] },
      { onText: (t) => texts.push(t) },
    );
    expect(result.content).toBe("ab");
    expect(texts).toEqual(["a", "b"]);
    expect((seen!.headers as Record<string, string>).Authorization).toBe(
      "Bearer k",
    );
    expect(JSON.parse(seen!.body as string).stream).toBe(true);
  });

  it("reports provider errors with their message", async () => {
    const client = new LlmClient({ baseUrl: "http://llm" }, () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { message: "bad key" } }), {
          status: 401,
        }),
      ),
    );
    const err = (await client.listModels().catch((e: unknown) => e)) as Error;
    expect(err).toBeInstanceOf(LlmError);
    expect(err.message).toBe("Provider responded 401: bad key");
  });

  it("lists unique sorted model ids", async () => {
    const client = new LlmClient({ baseUrl: "http://llm" }, () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ data: [{ id: "b" }, { id: "a" }, { id: "b" }] }),
        ),
      ),
    );
    expect(await client.listModels()).toEqual(["a", "b"]);
  });
});
