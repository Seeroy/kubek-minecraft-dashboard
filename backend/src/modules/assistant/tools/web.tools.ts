import { Injectable } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import { LlmError } from "../llm/llm-client";
import { AssistantSettingsService } from "../settings/assistant-settings.service";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

const TIMEOUT_MS = 30_000;

interface SearchResult {
  title?: string;
  url?: string;
  summary?: string;
  snippet?: string;
  date?: string | null;
}

/**
 * Web search over DeepSeek's Search and Fetch API. Its in-chat search tools
 * cannot be mixed with function tools, so the panel runs them as its own
 */
@Injectable()
export class WebTools implements ToolGroup {
  constructor(private readonly settings: AssistantSettingsService) {}

  tools(): AssistantTool[] {
    return [this.search(), this.readUrl()];
  }

  private search() {
    return defineTool({
      name: "web_search",
      description:
        "Search the web for current information like docs, plugin pages, error messages or versions. Cite the pages you use as markdown links",
      kind: "read",
      access: [AccessArea.ASSISTANT, "read"],
      serverScoped: false,
      feature: "webSearch",
      args: z.object({
        query: z
          .string()
          .min(1)
          .max(128)
          .describe("Supports site:, -site:, quoted phrases and after:YYYY-MM-DD"),
        count: z.number().int().min(1).max(10).optional(),
      }),
      run: async (ctx, args) => {
        const body = (await this.post(
          "search",
          { query: args.query, count: args.count ?? 5 },
          ctx.signal,
        )) as { results?: SearchResult[] };
        const results = body.results ?? [];
        if (!results.length) return { content: "No results" };
        return {
          content: results
            .map((item, index) =>
              [
                `${index + 1}. ${item.title || item.url}`,
                item.url,
                item.date ? `Date: ${item.date.slice(0, 10)}` : null,
                item.summary || item.snippet,
              ]
                .filter(Boolean)
                .join("\n"),
            )
            .join("\n\n"),
        };
      },
    });
  }

  private readUrl() {
    return defineTool({
      name: "read_url",
      description:
        "Read a web page as markdown, for a link from web_search or one the user gave",
      kind: "read",
      access: [AccessArea.ASSISTANT, "read"],
      serverScoped: false,
      feature: "webSearch",
      args: z.object({ url: z.url({ protocol: /^https?$/ }).max(8192) }),
      run: async (ctx, args) => {
        const page = (await this.post(
          "fetch",
          { url: args.url },
          ctx.signal,
        )) as { title?: string; content?: string };
        const title = page.title ? `# ${page.title}\n\n` : "";
        return { content: `${title}${page.content ?? ""}` };
      },
    });
  }

  private async post(
    path: "search" | "fetch",
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const { baseUrl, apiKey } = this.settings.connection();
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const res = await fetch(`${new URL(baseUrl).origin}/v1/tools/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const json = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    if (!res.ok) {
      throw new LlmError(
        `Web ${path} failed with ${res.status}: ${json?.error?.message ?? res.statusText}`,
        res.status,
      );
    }
    return json ?? {};
  }
}
