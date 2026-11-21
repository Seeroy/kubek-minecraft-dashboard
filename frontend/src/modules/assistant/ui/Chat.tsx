"use client";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { LoadReveal } from "@/shared/ui/data-reveal";
import { Skeleton } from "@/shared/ui/skeleton";
import type { IAssistantConversation, IAssistantMessage } from "@shared/types/assistant.types";
import { ArrowDown, CircleAlert } from "lucide-react";
import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useAssistantStatus, useConversationQuery } from "../api/assistant.queries";
import { useUsageFormat } from "../hooks/useUsageFormat";
import { estimateNext, totalUsage } from "../lib/usage";
import { useAssistantPanel } from "../lib/panel-store";
import { activePlan, toSegments } from "../lib/segments";
import { useLiveConversation } from "../lib/stream-store";
import { ContextMeter, PlanProgress } from "./ChatStatus";
import { Composer, type ComposerWaiting } from "./Composer";
import { Welcome } from "./Welcome";
import { ReasoningBlock } from "./MessageExtras";
import { SegmentView, StreamingText } from "./MessageItem";

const PINNED_GAP = 80;

// Follows new content only while the user is already at the bottom
function useStickToBottom(ref: RefObject<HTMLDivElement | null>, signal: unknown, onPinned?: (pinned: boolean) => void) {
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [ref, signal]);
  return () => {
    const el = ref.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < PINNED_GAP;
    onPinned?.(pinned.current);
  };
}

function ScrollDownButton({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const { t } = useTranslation("modules.assistant.chat");
  return (
    <Button
      variant="outline"
      size="icon-sm"
      title={t("scrollDown")}
      aria-label={t("scrollDown")}
      onClick={() => {
        const el = scrollRef.current;
        if (!el) return;
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
      }}
      className="absolute bottom-3 left-1/2 -translate-x-1/2 animate-pop-in rounded-full shadow-pop"
    >
      <ArrowDown />
    </Button>
  );
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
  useStickToBottom(scrollRef, drafts.map(([id, text]) => text.length + (live.thoughts[id]?.length ?? 0)).join() + String(thinking));

  return (
    <>
      {drafts.map(([id, text]) => (
        <Fragment key={id}>
          {live.thoughts[id] && <ReasoningBlock text={live.thoughts[id]} ms={null} live={!text} />}
          {(text || !live.thoughts[id]) && <StreamingText text={text} />}
        </Fragment>
      ))}
      {thinking && (
        <span aria-live="polite" aria-busy className="text-shimmer w-fit text-xs text-muted-foreground">
          {t("thinking")}
        </span>
      )}
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
    <div className="-mt-2 flex items-center justify-between gap-3 px-4 pb-2 text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
      <span className="min-w-0 truncate" title={format.details(total)}>
        {t("total")} {format.label(total)}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <ContextMeter messages={messages} />
        {next && (
          <span title={`${t("nextHint")}\n${format.label(next)}`}>
            {t("next")} ≈ {format.short(next)}
          </span>
        )}
      </span>
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
  const [pinned, setPinned] = useState(true);
  const onScroll = useStickToBottom(scrollRef, messages, setPinned);
  const plan = useMemo(() => activePlan(segments), [segments]);
  const waiting = useMemo(() => waitingFor(messages.at(-1)), [messages]);
  const serverName = useCallback((id: string | null) => servers.find((s) => s.id === id)?.name, [servers]);
  const onStarted = useCallback((conversation: IAssistantConversation) => showConversation(conversation.id), [showConversation]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
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
        {!pinned && conversationId && <ScrollDownButton scrollRef={scrollRef} />}
      </div>
      {plan && <PlanProgress plan={plan} />}
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

// What the composer waits on, the last message holds every pending call
function waitingFor(message: IAssistantMessage | undefined): ComposerWaiting {
  const pending = message?.toolCalls.filter((call) => call.status === "pending") ?? [];
  if (pending.some((call) => call.kind === "ask")) return "question";
  if (pending.some((call) => call.kind === "plan")) return "plan";
  return pending.length ? "action" : false;
}
