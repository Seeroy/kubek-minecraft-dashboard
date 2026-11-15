"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { humanizeFileSize } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Skeleton } from "@/shared/ui/skeleton";
import type { AssistantAttachment, AssistantSource } from "@shared/types/assistant.types";
import { Brain, ChevronRight, FileText, Globe } from "lucide-react";
import { useState } from "react";
import { useAttachmentUrl } from "../api/assistant.queries";

const seconds = (ms: number) => Math.max(1, Math.round(ms / 1000));

/** Thinking before an answer, folded so the answer stays the focus */
export function ReasoningBlock({ text, ms, live = false }: { text: string; ms: number | null; live?: boolean }) {
  const { t } = useTranslation("modules.assistant.chat");
  const [open, setOpen] = useState(false);
  const label = live ? t("thinking") : ms ? t("thoughtFor", seconds(ms)) : t("reasoning");
  // While streaming the last words show under the folded header, so it is visibly alive
  const tail = live && !open ? text.slice(-200).replace(/\s+/g, " ").trim() : "";

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="grid min-w-0 gap-1.5">
      <CollapsibleTrigger className="group/rsn inline-flex w-fit items-center gap-1.5 rounded-md text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground">
        <Brain className={cn("size-3.5", live && "animate-pulse motion-reduce:animate-none")} aria-hidden />
        {label}
        <ChevronRight className="size-3 transition-transform group-data-[panel-open]/rsn:rotate-90" aria-hidden />
      </CollapsibleTrigger>
      {tail && <p className="truncate border-l-2 border-border pl-3 text-xs text-muted-foreground/80">{tail}</p>}
      <CollapsibleContent className="max-h-80 scrollbar-thin overflow-y-auto border-l-2 border-border pl-3 text-xs leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
        {text}
      </CollapsibleContent>
    </Collapsible>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Pages a web search answer is based on */
export function SourcesList({ sources }: { sources: AssistantSource[] }) {
  const { t } = useTranslation("modules.assistant.chat");
  if (!sources.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">{t("sources")}</span>
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={source.title ?? source.url}
          className="inline-flex max-w-48 items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Globe className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{hostOf(source.url)}</span>
        </a>
      ))}
    </div>
  );
}

function ImageThumb({ conversationId, file }: { conversationId: string; file: AssistantAttachment }) {
  const url = useAttachmentUrl(conversationId, file.id);
  if (!url) return <Skeleton className="size-20 rounded-lg" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={file.name} className="block overflow-hidden rounded-lg border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element -- a blob URL, next/image cannot load it */}
      <img src={url} alt={file.name} className="size-20 object-cover" />
    </a>
  );
}

export function FileChip({ name, size, className, children }: { name: string; size: number; className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex max-w-56 items-center gap-1.5 rounded-lg border border-border bg-card py-1 pr-1.5 pl-2 text-xs", className)} title={name}>
      <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="truncate">{name}</span>
      <span className="shrink-0 text-muted-foreground tabular-nums">{humanizeFileSize(size)}</span>
      {children}
    </span>
  );
}

/** Files the user sent with a message */
export function MessageAttachments({ conversationId, files }: { conversationId: string; files: AssistantAttachment[] }) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {files.map((file) =>
        file.kind === "image" ? (
          <ImageThumb key={file.id} conversationId={conversationId} file={file} />
        ) : (
          <FileChip key={file.id} name={file.name} size={file.size} />
        )
      )}
    </div>
  );
}
