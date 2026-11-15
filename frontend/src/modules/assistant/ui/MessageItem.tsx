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
import { MessageAttachments, ReasoningBlock, SourcesList } from "./MessageExtras";
import { ToolCallGroup } from "./ToolCallCard";

// Shows on hover, always visible where there is no hover
const COPY_CLASS =
  "size-5 opacity-0 transition-opacity group-hover/msg:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100";
// Sits in the gap under the block so it never adds height
const COPY_BELOW = "absolute top-full -mt-0.5";

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
        <div className="ml-10 grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-end gap-1.5 self-end">
          <MessageAttachments conversationId={segment.message.conversationId} files={segment.message.attachments} />
          {segment.message.content && (
            <div className="group/msg relative">
              <div className="rounded-xl rounded-br-[5px] bg-primary/10 px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                {segment.message.content}
              </div>
              <CopyButton value={segment.message.content} title={t("copy")} className={cn(COPY_CLASS, COPY_BELOW, "right-0")} />
            </div>
          )}
        </div>
      );
    case "reasoning":
      return <ReasoningBlock text={segment.text} ms={segment.ms} />;
    case "text":
      return (
        <div className="group/msg relative grid grid-cols-[minmax(0,1fr)] gap-1">
          <Markdown text={segment.message.content} />
          <SourcesList sources={segment.message.sources} />
          {segment.usage ? (
            <div className="flex items-center gap-1">
              <UsageLine usage={segment.usage} />
              <CopyButton value={segment.message.content} title={t("copy")} className={COPY_CLASS} />
            </div>
          ) : (
            <CopyButton value={segment.message.content} title={t("copy")} className={cn(COPY_CLASS, COPY_BELOW, "-left-1")} />
          )}
        </div>
      );
    case "calls":
      return (
        <div className="grid gap-1">
          <ToolCallGroup calls={segment.calls} />
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
