import { z } from "zod";
import type { ToolResult } from "./tool.types";

export const serverIdArg = z
  .string()
  .min(1)
  .describe("Server id as returned by list_servers");

export const serverArgs = <S extends z.ZodRawShape>(shape: S) =>
  z.object({ serverId: serverIdArg, ...shape });

export const relativePath = z
  .string()
  .max(512)
  .describe("Path relative to the server folder, for example plugins/x.yml");

export const text = (content: string): ToolResult => ({ content });

export const json = (value: unknown): ToolResult => ({
  content: JSON.stringify(value, null, 1),
});

export const failure = (content: string): ToolResult => ({
  content,
  isError: true,
});
