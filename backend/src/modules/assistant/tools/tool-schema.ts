import { z } from "zod";
import type { ChatToolSpec } from "../llm/llm.types";
import type { AssistantTool } from "./tool.types";

/** OpenAI function definition of a tool */
export function toToolSpec(tool: AssistantTool): ChatToolSpec {
  const schema = z.toJSONSchema(tool.args, {
    target: "draft-7",
    io: "input",
    unrepresentable: "any",
  }) as Record<string, unknown>;
  delete schema.$schema;
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: schema,
    },
  };
}

export type ParsedArgs<A> =
  | { ok: true; args: A; raw: Record<string, unknown> }
  | { ok: false; error: string; raw: Record<string, unknown> };

/** Validates raw model arguments, errors are worded for the model to retry */
export function parseToolArgs<A>(
  tool: AssistantTool<A>,
  rawText: string,
): ParsedArgs<A> {
  let raw: unknown;
  try {
    raw = rawText.trim() ? JSON.parse(rawText) : {};
  } catch {
    return { ok: false, error: "Arguments are not valid JSON", raw: {} };
  }
  const rawObject =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const parsed = tool.args.safeParse(raw);
  if (parsed.success) return { ok: true, args: parsed.data, raw: rawObject };
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "args"}: ${issue.message}`)
    .join("; ");
  return { ok: false, error: `Invalid arguments: ${issues}`, raw: rawObject };
}
