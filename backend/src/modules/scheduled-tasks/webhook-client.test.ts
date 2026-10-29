import { describe, expect, test } from "bun:test";
import type { WebhookActionPayload } from "@shared/types/scheduler.types";
import { assertWebhookUrlShape, WebhookClient } from "./webhook-client";

type Call = { url: string; init: RequestInit };

function client(respond: (call: Call) => Response) {
  const calls: Call[] = [];
  const c = new WebhookClient();
  c.fetchImpl = (url, init) => {
    const call = { url, init };
    calls.push(call);
    return Promise.resolve(respond(call));
  };
  return { client: c, calls };
}

const hook = (url: string, extra: Partial<WebhookActionPayload> = {}) =>
  ({ url, method: "POST", body: "{}", ...extra }) as WebhookActionPayload;

describe("assertWebhookUrlShape", () => {
  test("local and private hosts are fine", () => {
    for (const url of [
      "http://localhost:5678/hook",
      "http://192.168.1.10/x",
      "https://n8n.lan/webhook",
    ]) {
      expect(() => assertWebhookUrlShape(url)).not.toThrow();
    }
  });

  test("rejects junk and other protocols", () => {
    expect(() => assertWebhookUrlShape("not a url")).toThrow();
    expect(() => assertWebhookUrlShape("ftp://example.com")).toThrow();
  });
});

describe("WebhookClient", () => {
  test("sends the request and reports the status", async () => {
    const { client: c, calls } = client(() => new Response("ok"));
    expect(await c.invoke(hook("http://127.0.0.1:8080/x"))).toBe(
      "HTTP 200 (2 bytes)",
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.body).toBe("{}");
  });

  test("GET goes without a body", async () => {
    const { client: c, calls } = client(() => new Response(""));
    await c.invoke(hook("https://example.com", { method: "GET" }));
    expect(calls[0].init.body).toBeUndefined();
  });

  test("errors carry only a short slice of the body", async () => {
    const { client: c } = client(
      () => new Response("x".repeat(5000), { status: 500 }),
    );
    const message = await c
      .invoke(hook("https://example.com"))
      .then(() => "", (e: Error) => e.message);
    expect(message.startsWith("HTTP 500: ")).toBe(true);
    expect(message.length).toBe("HTTP 500: ".length + 200);
  });

  test("oversized body is refused before sending", async () => {
    const { client: c, calls } = client(() => new Response(""));
    const big = hook("https://example.com", { body: "x".repeat(17 * 1024) });
    const message = await c.invoke(big).then(() => "", (e: Error) => e.message);
    expect(message).toContain("size limit");
    expect(calls).toHaveLength(0);
  });
});
