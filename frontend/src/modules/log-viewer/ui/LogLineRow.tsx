"use client";
import type { LogLineLevel, ParsedLogLine } from "@/modules/log-viewer/types";
import { cn } from "@/shared/lib/cn";
import React, { memo } from "react";

interface Props {
  line: ParsedLogLine;
  highlight?: string;
}

const LEVEL_CLASS: Record<LogLineLevel, string> = {
  INFO: "text-foreground/80",
  WARN: "text-amber-500",
  ERROR: "text-rose-500",
  DEBUG: "text-muted-foreground",
  OTHER: "text-foreground/70",
};

const LogLineRow: React.FC<Props> = memo(({ line, highlight }) => {
  return (
    <div className="flex w-max gap-2 font-mono text-xs leading-5 whitespace-pre">
      {line.time && (
        <span className="shrink-0 text-muted-foreground">{line.time}</span>
      )}
      {line.source && (
        <span className="shrink-0 text-muted-foreground/70">
          [{line.source}]
        </span>
      )}
      <span className={cn("shrink-0 font-semibold", LEVEL_CLASS[line.level])}>
        {line.level}
      </span>
      <span className={cn(LEVEL_CLASS[line.level])}>
        {highlight ? highlightMatch(line.message, highlight) : line.message}
      </span>
    </div>
  );
});

LogLineRow.displayName = "LogLineRow";

function highlightMatch(text: string, q: string) {
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(needle, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} className="rounded-sm bg-yellow-500/40 text-foreground">
        {text.slice(idx, idx + needle.length)}
      </mark>
    );
    i = idx + needle.length;
  }
  return <>{parts}</>;
}

export default LogLineRow;
