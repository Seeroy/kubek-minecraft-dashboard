"use client";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/shared/ui/input-group";
import { Panel } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Archive, ChevronDown, ChevronUp, Download, FileText, Search, WrapText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ILogFile, ParsedLogLine } from "../types";
import { parseLogLine } from "../utils/parse-log-line";
import { LogLines, type LogLinesHandle } from "./LogLines";

interface LogViewProps {
  file: ILogFile | undefined;
  content: string | undefined;
  loading: boolean;
}

const SKELETON_WIDTHS = ["70%", "55%", "82%", "40%", "64%"];

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  // Archives arrive already unpacked, so the saved file is plain text
  link.download = name.replace(/\.gz$/, "");
  link.click();
  URL.revokeObjectURL(url);
}

export function LogView({ file, content, loading }: LogViewProps) {
  const { t } = useTranslation("modules.logViewer.viewer");
  const [query, setQuery] = useState("");
  // The picked match belongs to one query, a new query starts from the newest match
  const [pick, setPick] = useState<{ needle: string; index: number } | null>(null);
  const [wrap, setWrap] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const linesRef = useRef<LogLinesHandle>(null);
  const needle = useDebouncedValue(query.trim().toLowerCase(), 200);

  const lines = useMemo<ParsedLogLine[]>(() => (content ? content.replace(/\n$/, "").split(/\r?\n/).map(parseLogLine) : []), [content]);
  const hits = useMemo(
    () => (needle ? lines.flatMap((line, index) => (line.raw.toLowerCase().includes(needle) ? [index] : [])) : []),
    [lines, needle]
  );
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const line of lines) result[line.level] = (result[line.level] ?? 0) + 1;
    return result;
  }, [lines]);
  // The newest match sits closest to the tail, where reading starts
  const current = !hits.length ? -1 : pick?.needle === needle ? Math.min(pick.index, hits.length - 1) : hits.length - 1;

  useEffect(() => {
    if (current >= 0) linesRef.current?.scrollTo(hits[current]);
  }, [current, hits]);

  // Cmd or Ctrl+F jumps into the line search instead of the browser one
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const step = (delta: number) => {
    if (hits.length) setPick({ needle, index: (current + delta + hits.length) % hits.length });
  };

  return (
    <Panel className="min-h-0 overflow-hidden max-lg:h-[70vh]">
      <div className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-2 border-b border-border py-2 pr-3 pl-4">
        {file && (
          <>
            <Plate tone={file.gzipped ? "orange" : "blue"} size="sm">
              {file.gzipped ? <Archive /> : <FileText />}
            </Plate>
            <h2 className="min-w-0 truncate font-mono text-[13px] font-semibold">{file.name}</h2>
            {file.gzipped && <Badge variant="secondary">GZ</Badge>}
            <Badge variant="secondary">{formatBytes(file.size)}</Badge>
          </>
        )}
        <div className="ml-auto flex items-center gap-1 max-sm:ml-0 max-sm:w-full">
          <InputGroup className="w-72 max-sm:w-auto max-sm:min-w-0 max-sm:flex-1">
            <InputGroupAddon>
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              value={query}
              placeholder={t("search")}
              aria-label={t("search")}
              disabled={!lines.length}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  step(e.shiftKey ? -1 : 1);
                }
                if (e.key === "Escape") setQuery("");
              }}
            />
            {needle && (
              <InputGroupAddon align="inline-end">
                <InputGroupText className={cn("text-[11.5px] tabular-nums", !hits.length && "text-danger")}>
                  {hits.length ? t("position", current + 1, hits.length) : t("nothingFound")}
                </InputGroupText>
                <InputGroupButton size="icon-xs" aria-label={t("prev")} title={t("prev")} disabled={!hits.length} onClick={() => step(-1)}>
                  <ChevronUp />
                </InputGroupButton>
                <InputGroupButton size="icon-xs" aria-label={t("next")} title={t("next")} disabled={!hits.length} onClick={() => step(1)}>
                  <ChevronDown />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
          <Button
            variant="ghost"
            size="icon"
            aria-pressed={wrap}
            title={t("wrap")}
            aria-label={t("wrap")}
            className="aria-pressed:text-primary"
            onClick={() => setWrap((on) => !on)}
          >
            <WrapText />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={t("download")}
            aria-label={t("download")}
            disabled={!file || !content}
            onClick={() => file && content && download(file.name, content)}
          >
            <Download />
          </Button>
        </div>
      </div>

      {!file ? (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>{t("pick")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : loading ? (
        <div className="grid flex-1 content-start gap-2 bg-code p-4">
          {SKELETON_WIDTHS.map((width) => (
            <Skeleton key={width} className="h-3" style={{ width }} />
          ))}
          <span className="text-[12.5px] text-muted-foreground">{t("loading")}</span>
        </div>
      ) : lines.length === 0 ? (
        <p className="flex-1 bg-code p-4 text-[13px] text-muted-foreground">{t("empty")}</p>
      ) : (
        <LogLines ref={linesRef} lines={lines} needle={needle} hits={hits} current={current >= 0 ? hits[current] : -1} wrap={wrap} />
      )}

      <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{t("lines", lines.length)}</span>
        <span className="ml-auto flex gap-3 tabular-nums">
          <span className="tone-amber inline-flex items-center gap-1.5">
            <i className="size-[7px] rounded-full bg-tone" />
            <b className="font-semibold text-foreground">{counts.WARN ?? 0}</b> WARN
          </span>
          <span className="tone-red inline-flex items-center gap-1.5">
            <i className="size-[7px] rounded-full bg-tone" />
            <b className="font-semibold text-foreground">{counts.ERROR ?? 0}</b> ERROR
          </span>
        </span>
      </div>
    </Panel>
  );
}
