import { describe, expect, it } from "bun:test";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import { parseToolArgs, toToolSpec } from "./tool-schema";
import { defineTool } from "./tool.types";

const tool = defineTool({
  name: "read_file",
  description: "Read a file",
  kind: "read",
  access: [AccessArea.FILES, "read"],
  serverScoped: true,
  args: z.object({
    serverId: z.string().describe("Server id"),
    path: z.string().min(1),
    lines: z.number().int().max(500).default(100),
  }),
  run: () => Promise.resolve({ content: "" }),
});

describe("toToolSpec", () => {
  it("converts zod args to a function definition", () => {
    const spec = toToolSpec(tool);
    expect(spec.type).toBe("function");
    expect(spec.function.name).toBe("read_file");
    const params = spec.function.parameters as {
      type: string;
      properties: Record<string, { type: string; description?: string }>;
      required: string[];
      $schema?: string;
    };
    expect(params.$schema).toBeUndefined();
    expect(params.type).toBe("object");
    expect(params.properties.serverId.description).toBe("Server id");
    expect(params.properties.lines.type).toBe("integer");
    // Defaulted fields are optional for the caller
    expect(params.required).toEqual(["serverId", "path"]);
  });
});

describe("parseToolArgs", () => {
  it("applies defaults", () => {
    const parsed = parseToolArgs(tool, '{"serverId":"s","path":"a.txt"}');
    expect(parsed).toEqual({
      ok: true,
      args: { serverId: "s", path: "a.txt", lines: 100 },
      raw: { serverId: "s", path: "a.txt" },
    });
  });

  it("treats empty arguments as an empty object", () => {
    const parsed = parseToolArgs(tool, "");
    expect(parsed.ok).toBe(false);
  });

  it("explains invalid input", () => {
    const parsed = parseToolArgs(
      tool,
      '{"serverId":"s","path":"","lines":900}',
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain("path:");
      expect(parsed.error).toContain("lines:");
    }
  });

  it("rejects broken JSON", () => {
    expect(parseToolArgs(tool, "{oops")).toEqual({
      ok: false,
      error: "Arguments are not valid JSON",
      raw: {},
    });
  });
});
