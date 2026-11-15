"use client";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { LoadReveal } from "@/shared/ui/data-reveal";
import { Skeleton } from "@/shared/ui/skeleton";
import type { IAssistantConversation, IAssistantMessage } from "@shared/types/assistant.types";
import { CircleAlert } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useAssistantStatus, useConversationQuery } from "../api/assistant.queries";
import { useUsageFormat } from "../hooks/useUsageFormat";
import { estimateNext, totalUsage } from "../lib/usage";
import { useAssistantPanel } from "../lib/panel-store";
import { toSegments } from "../lib/segments";
import { useLiveConversation } from "../lib/stream-store";
import { Composer } from "./Composer";
import { Welcome } from "./Welcome";
import { SegmentView, StreamingText } from "./MessageItem";

const PINNED_GAP = 80;

// Follows new content only while the user is already at the bottom
function useStickToBottom(ref: RefObject<HTMLDivElement | null>, signal: unknown) {
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [ref, signal]);
  return () => {
    const el = ref.current;
    if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < PINNED_GAP;
  };
}

function LiveTail({
  conversationId,
  saved,
  scrollRef,
}: {
  conversationId: string | null;
  saved: IAssistantMessage[];
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation("modules.assistant.chat");
  const live = useLiveConversation(conversationId);
  const drafts = Object.entries(live.drafts).filter(([id]) => !saved.some((m) => m.id === id));
  const thinking = live.running && drafts.length === 0;
  useStickToBottom(scrollRef, drafts.map(([, text]) => text.length).join() + String(thinking));

  return (
    <>
      {drafts.map(([id, text]) => (
        <StreamingText key={id} text={text} />
      ))}
      {thinking && <StreamingText text="" />}
      {live.error && !live.running && (
        <div className="flex items-start gap-2 text-xs text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{live.error || t("failed")}</span>
        </div>
      )}
    </>
  );
}

function UsageFooter({ messages }: { messages: IAssistantMessage[] }) {
  const { t } = useTranslation("modules.assistant.usage");
  const pricing = useAssistantStatus().data?.pricing ?? null;
  const format = useUsageFormat();
  const total = totalUsage(messages);
  if (!total) return null;
  const next = estimateNext(messages, pricing);

  return (
    <div className="-mt-2 flex flex-wrap justify-center gap-x-1.5 px-4 pb-2 text-[11px] text-muted-foreground tabular-nums">
      <span title={format.details(total)}>
        {t("total")}: {format.label(total)}
      </span>
      {next && (
        <span title={t("nextHint")}>
          · {t("next")} ≈ {format.label(next)}
        </span>
      )}
    </div>
  );
}

export function Chat({ conversationId }: { conversationId: string | null }) {
  const { t } = useTranslation("modules.assistant.chat");
  const showConversation = useAssistantPanel((s) => s.showConversation);
  const prefill = useAssistantPanel((s) => s.prefill);
  const prefillKey = useAssistantPanel((s) => s.prefillKey);
  const { servers } = useServerStore();
  const detail = useConversationQuery(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = useMemo(() => detail.data?.messages ?? [], [detail.data]);
  const segments = useMemo(() => toSegments(messages), [messages]);
  const onScroll = useStickToBottom(scrollRef, messages);
  const waiting = !!messages.at(-1)?.toolCalls.some((call) => call.status === "pending");
  const serverName = useCallback((id: string | null) => servers.find((s) => s.id === id)?.name, [servers]);
  const onStarted = useCallback((conversation: IAssistantConversation) => showConversation(conversation.id), [showConversation]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="flex scrollbar-thin min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-3">
        {conversationId && detail.isError && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-[13px] text-muted-foreground">
            {t("loadError")}
            <Button variant="outline" size="sm" onClick={() => void detail.refetch()}>
              {t("retry")}
            </Button>
          </div>
        )}
        {!conversationId && <Welcome />}
        {/* Only saved history is revealed, live tokens are not */}
        <LoadReveal
          loading={!!conversationId && detail.isPending}
          className="flex flex-col gap-4 empty:hidden"
          skeleton={
            <div className="grid gap-3">
              <Skeleton className="ml-auto h-9 w-2/3" />
              <Skeleton className="h-16 w-full" />
            </div>
          }
        >
          {segments.map((segment) => (
            <SegmentView key={segment.key} segment={segment} serverName={serverName} />
          ))}
        </LoadReveal>
        <LiveTail conversationId={conversationId} saved={messages} scrollRef={scrollRef} />
      </div>
      <Composer
        // A new prefill or another conversation starts with a fresh draft
        key={`${conversationId ?? "new"}:${prefillKey}`}
        conversationId={conversationId}
        running={!!detail.data?.running}
        waiting={waiting}
        initialText={conversationId ? "" : (prefill ?? "")}
        onStarted={onStarted}
      />
      <UsageFooter messages={messages} />
    </div>
  );
}
