import { BadRequestException, Injectable } from "@nestjs/common";
import type { WebhookActionPayload } from "@shared/types/scheduler.types";

const WEBHOOK_TIMEOUT_MS = 10_000;
const WEBHOOK_MAX_BODY_BYTES = 16 * 1024;
const RESPONSE_PREVIEW_CHARS = 2000;
const ERROR_PREVIEW_CHARS = 200;

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/** Any http(s) url, local ones like n8n too */
export function assertWebhookUrlShape(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException("Invalid webhook URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BadRequestException("Webhook URL must use http or https");
  }
  return parsed;
}

/** Outgoing scheduler webhooks */
@Injectable()
export class WebhookClient {
  /** Swappable for tests */
  fetchImpl: FetchFn = (url, init) => fetch(url, init);

  async invoke(payload: WebhookActionPayload): Promise<string> {
    assertWebhookUrlShape(payload.url);
    const body =
      payload.body && payload.method !== "GET" ? payload.body : undefined;
    if (body && Buffer.byteLength(body, "utf8") > WEBHOOK_MAX_BODY_BYTES) {
      throw new Error("Webhook body exceeds size limit");
    }

    const response = await this.fetchImpl(payload.url, {
      method: payload.method,
      headers: payload.headers,
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    const text = await readPreview(response, RESPONSE_PREVIEW_CHARS + 1);
    const truncated =
      text.length > RESPONSE_PREVIEW_CHARS
        ? text.slice(0, RESPONSE_PREVIEW_CHARS) + "…"
        : text;

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${truncated.slice(0, ERROR_PREVIEW_CHARS)}`,
      );
    }
    return `HTTP ${response.status} (${truncated.length} bytes)`;
  }
}

/** Read up to limit chars, skip the rest */
async function readPreview(response: Response, limit: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (text.length < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  return text;
}
