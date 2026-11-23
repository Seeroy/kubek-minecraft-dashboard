import type { ConfigFileSpec } from "@/shared/types/server-types.types";

export interface SyntaxProblem {
  /** Parser message as the browser gives it */
  details: string;
  line?: number;
  column?: number;
  empty?: boolean;
}

function locate(text: string, message: string): Pick<SyntaxProblem, "line" | "column"> {
  // Chrome and Firefox both mention "line N column M"
  const lineColumn = /line (\d+) column (\d+)/i.exec(message);
  if (lineColumn) return { line: Number(lineColumn[1]), column: Number(lineColumn[2]) };
  const position = /position (\d+)/i.exec(message);
  if (!position) return {};
  const before = text.slice(0, Number(position[1])).split("\n");
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

/** Checks the formats the browser can parse on its own, the rest is saved as plain text */
export function findSyntaxProblem(parser: ConfigFileSpec["parser"], text: string): SyntaxProblem | null {
  if (parser !== "json") return null;
  if (!text.trim()) return { details: "", empty: true };
  try {
    JSON.parse(text);
    return null;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return { details, ...locate(text, details) };
  }
}
