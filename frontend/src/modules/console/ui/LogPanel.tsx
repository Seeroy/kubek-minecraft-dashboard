"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel, PanelActions, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, Download, ScrollText, Search } from "lucide-react";
import { useDeferredValue, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useConsoleLines } from "../hooks/useConsoleLog";
import { kubekEventText } from "../lib/kubek-event";
import { LogLine } from "./LogLine";

const STICK_THRESHOLD_PX = 32;
const LINE_HEIGHT_PX = 20;

const lineText = (log: IInstanceLog, t: (key: string, ...args: unknown[]) => string) =>
  log.type === "kubek" || log.type === "telegram" ? kubekEventText(log, t) : (log.line ?? "");

function download(name: string, lines: IInstanceLog[], t: (key: string, ...args: unknown[]) => string) {
  const text = lines.map((log) => `[${log.timestamp}] ${lineText(log, t)}`).join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `${name}-console.log` });
  link.click();
  URL.revokeObjectURL(url);
}

interface LogPanelProps {
  serverName: string;
  headerActions?: ReactNode;
  footer: ReactNode;
}

export function LogPanel({ serverName, headerActions, footer }: LogPanelProps) {
  const { t } = useTranslation("modules.console");
  const { lines, version } = useConsoleLines();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stuckRef = useRef(true);
  const [unseenFrom, setUnseenFrom] = useState<number | null>(null);

  // A search narrows the log to matching lines instead of highlighting inside ANSI output
  const visible = useMemo(() => {
    if (!deferredQuery) return lines;
    return lines.filter((log) => lineText(log, t).toLowerCase().includes(deferredQuery));
    // version stands in for the mutated array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, version, deferredQuery, t]);

  // TanStack Virtual returns fresh functions by design, nothing here relies on memoizing them
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => LINE_HEIGHT_PX,
    overscan: 20,
  });

  useLayoutEffect(() => {
    if (stuckRef.current && visible.length > 0) virtualizer.scrollToIndex(visible.length - 1, { align: "end" });
  }, [version, visible.length, virtualizer]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const stuck = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD_PX;
    if (stuck !== stuckRef.current) {
      stuckRef.current = stuck;
      setUnseenFrom(stuck ? null : visible.length);
    }
  };

  const jumpToEnd = () => {
    stuckRef.current = true;
    setUnseenFrom(null);
    virtualizer.scrollToIndex(visible.length - 1, { align: "end" });
  };

  const unseen = unseenFrom === null ? 0 : Math.max(0, visible.length - unseenFrom);

  return (
    <Panel className="relative h-[70vh] min-h-0 overflow-hidden lg:h-auto">
      <PanelHead className="min-h-13">
        <PanelTitle>{t("log.title")}</PanelTitle>
        <PanelMeta>{t("log.lines", lines.length)}</PanelMeta>
        <PanelActions>
          {headerActions}
          <InputGroup className="hidden w-56 sm:flex">
            <InputGroupAddon>
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("log.search")} aria-label={t("log.search")} />
          </InputGroup>
          <Button variant="ghost" size="sm" onClick={() => download(serverName, lines, t)} disabled={lines.length === 0}>
            <Download />
            <span className="hidden md:inline">{t("log.download")}</span>
          </Button>
        </PanelActions>
      </PanelHead>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="log"
        aria-live="off"
        className="min-h-0 flex-1 scrollbar-thin overflow-y-auto bg-code py-2 font-mono text-[12.5px] leading-[1.6] text-code-foreground"
      >
        {visible.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScrollText />
              </EmptyMedia>
              <EmptyTitle className="font-sans">{deferredQuery ? t("log.noMatches") : t("log.empty")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="relative h-(--h) w-full" style={{ "--h": `${virtualizer.getTotalSize()}px` } as CSSProperties}>
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={item.key}
                ref={virtualizer.measureElement}
                data-index={item.index}
                className="absolute top-0 left-0 w-full translate-y-(--y)"
                style={{ "--y": `${item.start}px` } as CSSProperties}
              >
                <LogLine log={visible[item.index]} />
              </div>
            ))}
          </div>
        )}
      </div>

      {unseen > 0 && (
        <Button size="sm" className="absolute bottom-[68px] left-1/2 -translate-x-1/2 shadow-pop" onClick={jumpToEnd}>
          <ArrowDown />
          {t("log.newLines", unseen)}
        </Button>
      )}

      {footer}
    </Panel>
  );
}
