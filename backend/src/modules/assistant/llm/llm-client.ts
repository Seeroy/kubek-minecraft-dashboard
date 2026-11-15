import { getErrorMessage } from "@/core/utils/error";
import type { AssistantModelInfo } from "@shared/types/assistant.types";
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
// stream_options is the OpenAI way to get token counts, usage.include adds the cost on OpenRouter
const STREAM_USAGE = { stream_options: { include_usage: true } };
const OPENROUTER_USAGE = { ...STREAM_USAGE, usage: { include: true } };
const REJECTED = new Set([400, 422]);
// Whole answer, local models on a CPU are slow
const COMPLETION_TIMEOUT_MS = 5 * 60_000;

/** Minimal client for OpenAI compatible chat/completions and models endpoints */
export class LlmClient {
  constructor(
    private readonly connection: LlmConnection,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async listModels(): Promise<AssistantModelInfo[]> {
    const models = new Map<string, AssistantModelInfo>();
    for (const entry of await this.listModelEntries()) {
      if (typeof entry.id !== "string" || models.has(entry.id)) continue;
      models.set(entry.id, { id: entry.id, name: displayName(entry) });
    }
    return [...models.values()].sort((a, b) =>
      (a.name ?? a.id).localeCompare(b.name ?? b.id),
    );
  }

  /** Raw model objects, their capability fields differ from provider to provider */
  async listModelEntries(): Promise<Record<string, unknown>[]> {
    const res = await this.request("models", {
      method: "GET",
      signal: AbortSignal.timeout(MODELS_TIMEOUT_MS),
    });
    const body = (await res.json()) as { data?: unknown };
    return Array.isArray(body.data)
      ? body.data.filter(
          (model): model is Record<string, unknown> =>
            !!model && typeof model === "object",
        )
      : [];
  }

  /** Streams one completion, the callbacks get answer and thinking deltas as they arrive */
  async stream(
    req: ChatRequest,
    opts: {
      signal?: AbortSignal;
      onText?: (text: string) => void;
      onReasoning?: (text: string) => void;
    } = {},
  ): Promise<ChatCompletion> {
    const timeout = AbortSignal.timeout(COMPLETION_TIMEOUT_MS);
    const signal = opts.signal
      ? AbortSignal.any([opts.signal, timeout])
      : timeout;
    const { serverTools, options, ...rest } = req;
    const tools = [...(req.tools ?? []), ...(serverTools ?? [])];
    const body = {
      ...rest,
      tools: tools.length ? tools : undefined,
      stream: true,
    };
    const post = (extra: Record<string, unknown>) =>
      this.request("chat/completions", {
        method: "POST",
        body: JSON.stringify({ ...body, ...extra }),
        signal,
      });
    const usage = /openrouter\.ai/i.test(this.connection.baseUrl)
      ? OPENROUTER_USAGE
      : STREAM_USAGE;
    let res: Response;
    try {
      res = await post({ ...usage, ...options });
    } catch (err) {
      // Strict servers reject unknown fields, usage and tuning are nice to have
      if (!(err instanceof LlmError) || !REJECTED.has(err.status ?? 0))
        throw err;
      res = await post({});
    }
    if (!res.body) throw new LlmError("Provider returned an empty response");

    const acc = new CompletionAccumulator();
    for await (const data of readSseData(res.body)) {
      if (data === "[DONE]") break;
      const added = acc.push(parseChunk(data));
      if (added.reasoning) opts.onReasoning?.(added.reasoning);
      if (added.text) opts.onText?.(added.text);
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

// Providers call it name, display_name or title, an echo of the id says nothing
function displayName(entry: Record<string, unknown>): string | null {
  for (const key of ["display_name", "name", "title"]) {
    const value = entry[key];
    if (typeof value === "string" && value.trim() && value !== entry.id)
      return value.trim();
  }
  return null;
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
