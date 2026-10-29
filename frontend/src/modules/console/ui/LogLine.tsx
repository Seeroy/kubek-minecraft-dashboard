"use client";

import { ExplainButton } from "@/modules/assistant";
import AnsiText from "@/shared/ui/AnsiText";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { toneClass, type Tone } from "@/shared/ui/tone";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { memo, type ReactNode } from "react";
import { describeKubekEvent } from "../lib/kubek-event";
import { parseLog } from "../utils/parseLog";

const levelTone: Record<string, Tone> = {
  INFO: "blue",
  WARN: "amber",
  WARNING: "amber",
  ERROR: "red",
  FATAL: "red",
  SEVERE: "red",
};

const ERROR_LEVELS = new Set(["ERROR", "FATAL", "SEVERE"]);

function ExplainLine({ line }: { line: string }) {
  const { t } = useTranslation("modules.console");
  return (
    <ExplainButton
      compact
      prompt={t("explainPrompt", line)}
      className="ml-1 align-middle opacity-0 group-hover/line:opacity-100 focus-visible:opacity-100"
    />
  );
}

const shortTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const row = "px-4 py-px break-words whitespace-pre-wrap";

function Time({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">[{children}]</span>;
}

function LevelBadge({ tone, solid, children }: { tone: Tone; solid?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "mx-2 inline-flex items-center rounded border px-1.5 align-[1px] text-[11px] leading-4 font-semibold",
        toneClass[tone],
        solid ? "border-tone bg-tone text-on-tone" : "border-tone/30 bg-tone/14 text-tone"
      )}
    >
      {children}
    </span>
  );
}

function KubekLine({ log }: { log: IInstanceLog }) {
  const { t } = useTranslation("modules.console");
  const telegram = log.type === "telegram";
  const event = describeKubekEvent(log, t, telegram ? "blue" : "purple");
  if (!event) return null;

  return (
    <Tooltip>
      <TooltipTrigger render={<div className={cn(row, "cursor-help hover:bg-hover")} />}>
        <Time>{shortTime(log.timestamp)}</Time>
        <LevelBadge tone={telegram ? "blue" : "purple"} solid>
          {telegram ? "TG" : "KUBEK"}
        </LevelBadge>
        {event.content}
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="block min-w-64 bg-popover p-3 text-popover-foreground">
        <KeyValue className="text-xs">
          {event.details.map(([label, value]) => (
            <KeyValueItem key={label} label={label}>
              {value}
            </KeyValueItem>
          ))}
        </KeyValue>
      </TooltipContent>
    </Tooltip>
  );
}

export const LogLine = memo(function LogLine({ log }: { log: IInstanceLog }) {
  if (log.type === "kubek" || log.type === "telegram") return <KubekLine log={log} />;

  const line = (log.line ?? "").trim();

  if (log.type === "stdin") {
    return (
      <div className={row}>
        <Time>{shortTime(log.timestamp)}</Time>
        <LevelBadge tone="green">CMD</LevelBadge>
        <span className="text-c-green">{line}</span>
      </div>
    );
  }

  const parsed = parseLog(line);
  if (!parsed.time || !parsed.level) {
    return (
      <div className={row}>
        <AnsiText className="text-[length:inherit]">{line}</AnsiText>
      </div>
    );
  }

  const level = parsed.level.toUpperCase();
  return (
    <div className={cn(row, "group/line")}>
      <Time>{parsed.time}</Time>
      <LevelBadge tone={levelTone[level] ?? "gray"}>{level}</LevelBadge>
      <AnsiText className="text-[length:inherit]">{parsed.message}</AnsiText>
      {ERROR_LEVELS.has(level) && <ExplainLine line={line} />}
    </div>
  );
});
