"use client";
import { cn } from "@/shared/lib/cn";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from "react";
import type { LogLineLevel, ParsedLogLine } from "../types";

export interface LogLinesHandle {
  scrollTo: (index: number) => void;
}

interface LogLinesProps {
  ref?: Ref<LogLinesHandle>;
  lines: ParsedLogLine[];
  needle: string;
  hits: number[];
  current: number;
  wrap: boolean;
}

const LEVEL_CLASS: Record<LogLineLevel, string> = {
  INFO: "",
  WARN: "text-[color-mix(in_oklch,var(--warn),var(--foreground)_15%)]",
  ERROR: "text-danger",
  DEBUG: "text-muted-foreground",
  OTHER: "",
};

function highlight(text: string, needle: string): ReactNode {
  if (!needle) return text;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="rounded-[2px] bg-warn/40 text-inherit">
        {text.slice(at, at + needle.length)}
      </mark>
    );
    from = at + needle.length;
  }
  parts.push(text.slice(from));
  return parts;
}

const Line = memo(function Line({ line, number, needle, state, wrap }: { line: ParsedLogLine; number: number; needle: string; state: "hit" | "current" | null; wrap: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[56px_64px_auto_48px_minmax(0,1fr)] gap-2 pr-4 hover:bg-hover max-sm:grid-cols-[40px_64px_minmax(0,1fr)]",
        wrap ? "w-auto" : "w-max min-w-full whitespace-pre",
        state === "hit" && "bg-warn/6",
        state === "current" && "bg-warn/16 shadow-[inset_2px_0_0_var(--warn)]"
      )}
    >
      <span className="border-r border-border pr-1 text-right text-muted-foreground/45 select-none">{number}</span>
      <span className="text-muted-foreground/75">{line.time ?? ""}</span>
      <span className="text-muted-foreground/60 max-sm:hidden">{line.source ? `[${line.source}]` : ""}</span>
      <span className={cn("text-[11px] font-semibold tracking-[0.04em] text-muted-foreground max-sm:hidden", LEVEL_CLASS[line.level])}>
        {line.level === "OTHER" ? "" : line.level}
      </span>
      <span className={cn(LEVEL_CLASS[line.level], wrap && "break-words whitespace-pre-wrap")}>{highlight(line.message, needle)}</span>
    </div>
  );
});

export function LogLines({ ref, lines, needle, hits, current, wrap }: LogLinesProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const hitSet = useMemo(() => new Set(hits), [hits]);
  // The compiler skips this component, the virtualizer re-renders it on scroll itself
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 20,
    overscan: 30,
  });

  useImperativeHandle(ref, () => ({ scrollTo: (index) => virtualizer.scrollToIndex(index, { align: "center" }) }), [virtualizer]);

  // A log is read from its tail, so a freshly opened file starts at the bottom
  useEffect(() => {
    virtualizer.scrollToIndex(lines.length - 1, { align: "end" });
  }, [lines, virtualizer]);

  return (
    <div
      ref={scroller}
      role="log"
      className="min-h-0 flex-1 scrollbar-thin overflow-auto bg-code py-2 font-mono text-[12.5px] leading-[1.6] text-code-foreground"
    >
      <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            ref={virtualizer.measureElement}
            data-index={item.index}
            className={cn("absolute top-0 left-0", wrap ? "w-full" : "min-w-full")}
            style={{ transform: `translateY(${item.start}px)` }}
          >
            <Line
              line={lines[item.index]}
              number={item.index + 1}
              needle={hitSet.has(item.index) ? needle : ""}
              state={item.index === current ? "current" : hitSet.has(item.index) ? "hit" : null}
              wrap={wrap}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
