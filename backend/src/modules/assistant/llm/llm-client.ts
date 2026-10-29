import { getErrorMessage } from "@/core/utils/error";
import { CompletionAccumulator } from "./completion-accumulator";
import type { ChatCompletion, ChatRequest, LlmConnection } from "./llm.types";
import { readSseData } from "./sse";

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
  }
}

const MODELS_TIMEOUT_MS = 15_000;
// Whole answer, local models on a CPU are slow
const COMPLETION_TIMEOUT_MS = 5 * 60_000;

/** Minimal client for OpenAI compatible chat/completions and models endpoints */
export class LlmClient {
  constructor(
    private readonly connection: LlmConnection,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async listModels(): Promise<string[]> {
    const res = await this.request("models", {
      method: "GET",
      signal: AbortSignal.timeout(MODELS_TIMEOUT_MS),
    });
    const body = (await res.json()) as { data?: { id?: unknown }[] };
    const ids = (body.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => typeof id === "string");
    return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
  }

  /** Streams one completion, onText gets every content delta as it arrives */
  async stream(
    req: ChatRequest,
    opts: { signal?: AbortSignal; onText?: (text: string) => void } = {},
  ): Promise<ChatCompletion> {
    const timeout = AbortSignal.timeout(COMPLETION_TIMEOUT_MS);
    const signal = opts.signal
      ? AbortSignal.any([opts.signal, timeout])
      : timeout;
    const res = await this.request("chat/completions", {
      method: "POST",
      body: JSON.stringify({
        ...req,
        tools: req.tools?.length ? req.tools : undefined,
        stream: true,
      }),
      signal,
    });
    if (!res.body) throw new LlmError("Provider returned an empty response");

    const acc = new CompletionAccumulator();
    for await (const data of readSseData(res.body)) {
      if (data === "[DONE]") break;
      const chunk = parseChunk(data);
      const text = acc.push(chunk);
      if (text) opts.onText?.(text);
    }
    return acc.result();
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const url = `${this.connection.baseUrl.replace(/\/+$/, "")}/${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: init.method === "POST" ? "text/event-stream" : "application/json",
    };
    if (this.connection.apiKey)
      headers.Authorization = `Bearer ${this.connection.apiKey}`;

    let res: Response;
    try {
      res = await this.fetchImpl(url, { ...init, headers });
    } catch (err) {
      if (init.signal?.aborted && init.signal.reason?.name !== "TimeoutError")
        throw err;
      throw new LlmError(`Provider is unreachable: ${getErrorMessage(err)}`);
    }
    if (!res.ok) {
      throw new LlmError(await describeFailure(res), res.status);
    }
    return res;
  }
}

function parseChunk(data: string): unknown {
  let chunk: unknown;
  try {
    chunk = JSON.parse(data);
  } catch {
    throw new LlmError("Provider sent a malformed stream chunk");
  }
  const error = (chunk as { error?: { message?: string } })?.error;
  if (error) throw new LlmError(error.message ?? "Provider reported an error");
  return chunk;
}

async function describeFailure(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  let message = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const err = body.error;
    message =
      (typeof err === "string" ? err : err?.message) ?? body.message ?? message;
  } catch {
    // not JSON, keep the raw text
  }
  return `Provider responded ${res.status}${message ? `: ${message}` : ""}`;
}
