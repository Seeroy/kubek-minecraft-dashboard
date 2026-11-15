"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { CopyButton } from "@/shared/ui/CopyButton";
import { ASSISTANT_RUN_ERRORS, type AssistantUsage } from "@shared/types/assistant.types";
import { CircleAlert } from "lucide-react";
import { memo } from "react";
import { useUsageFormat } from "../hooks/useUsageFormat";
import type { ChatSegment } from "../lib/segments";
import { ConfirmCard } from "./ConfirmCard";
import { Markdown } from "./Markdown";
import { ToolCallGroup } from "./ToolCallCard";

// Shows on hover, always visible where there is no hover
const COPY_CLASS =
  "size-6 opacity-0 transition-opacity group-hover/msg:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100";

export function UsageLine({ usage, className }: { usage: AssistantUsage | null; className?: string }) {
  const format = useUsageFormat();
  if (!usage) return null;
  return (
    <span className={cn("text-[11px] text-muted-foreground tabular-nums", className)} title={format.details(usage)}>
      {format.label(usage)}
    </span>
  );
}

interface SegmentViewProps {
  segment: ChatSegment;
  serverName: (id: string | null) => string | undefined;
}

export const SegmentView = memo(function SegmentView({ segment, serverName }: SegmentViewProps) {
  const { t } = useTranslation("modules.assistant.chat");

  switch (segment.kind) {
    case "user":
      return (
        <div className="group/msg ml-10 flex flex-col items-end gap-0.5 self-end">
          <div className="rounded-xl rounded-br-[5px] bg-primary/10 px-3.5 py-2 text-[13px] leading-relaxed break-words whitespace-pre-wrap">
            {segment.message.content}
          </div>
          <CopyButton value={segment.message.content} title={t("copy")} className={COPY_CLASS} />
        </div>
      );
    case "text":
      return (
        <div className="group/msg grid gap-1">
          <Markdown text={segment.message.content} />
          <div className="flex min-h-6 items-center gap-1">
            <UsageLine usage={segment.usage} />
            <CopyButton value={segment.message.content} title={t("copy")} className={cn(COPY_CLASS, !segment.usage && "-ml-1.5")} />
          </div>
        </div>
      );
    case "calls":
      return (
        <div className="grid gap-1">
          <ToolCallGroup calls={segment.calls} />
          <UsageLine usage={segment.usage} className="pl-1" />
        </div>
      );
    case "confirm":
      return <ConfirmCard conversationId={segment.message.conversationId} call={segment.call} serverName={serverName(segment.call.serverId)} />;
    case "error":
      return (
        <div className="grid gap-1">
          <div className="flex items-start gap-2 text-xs text-danger">
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">
              {segment.error === ASSISTANT_RUN_ERRORS.stopped
                ? t("stopped")
                : segment.error === ASSISTANT_RUN_ERRORS.stepLimit
                  ? t("stepLimit")
                  : segment.error}
            </span>
          </div>
          <UsageLine usage={segment.usage} />
        </div>
      );
  }
});

export function StreamingText({ text }: { text: string }) {
  return (
    <div aria-live="polite" aria-busy>
      {text && <Markdown text={text} />}
      <span
        aria-hidden
        className="mt-1 inline-block h-3.5 w-1.5 animate-[blink_1s_steps(1)_infinite] rounded-[1px] bg-foreground/50 motion-reduce:animate-none"
      />
    </div>
  );
}
