import type { LogLineLevel, ParsedLogLine } from "@/modules/log-viewer/types";

// Matches typical Minecraft server log lines like:
//   [12:34:56] [Server thread/INFO]: Done (3.4s)
const MC_LINE =
  /^\[(\d{2}:\d{2}:\d{2})\]\s+\[([^\]/]+)\/(INFO|WARN|WARNING|ERROR|DEBUG)\]:\s+(.*)$/;

export function parseLogLine(raw: string): ParsedLogLine {
  const m = raw.match(MC_LINE);
  if (m) {
    const lvl = normalizeLevel(m[3]);
    return { raw, time: m[1], source: m[2], level: lvl, message: m[4] };
  }
  // Fallback: detect level keyword anywhere
  const upper = raw.toUpperCase();
  let level: LogLineLevel = "OTHER";
  if (upper.includes("ERROR")) level = "ERROR";
  else if (upper.includes("WARN")) level = "WARN";
  else if (upper.includes("INFO")) level = "INFO";
  else if (upper.includes("DEBUG")) level = "DEBUG";
  return { raw, level, message: raw };
}

function normalizeLevel(s: string): LogLineLevel {
  const up = s.toUpperCase();
  if (up === "WARNING") return "WARN";
  if (up === "INFO" || up === "WARN" || up === "ERROR" || up === "DEBUG")
    return up as LogLineLevel;
  return "OTHER";
}
