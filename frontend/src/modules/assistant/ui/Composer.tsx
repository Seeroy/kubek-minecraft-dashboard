"use client";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Button } from "@/shared/ui/button";
import type { IAssistantConversation } from "@shared/types/assistant.types";
import { ArrowUp, Server, Square } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useSendMessage, useStopConversation } from "../api/assistant.queries";
import { useLiveConversation } from "../lib/stream-store";

interface ComposerProps {
  conversationId: string | null;
  /** Server side running flag, the live store overrides it once events arrive */
  running: boolean;
  /** A write call waits for a decision */
  waiting: boolean;
  initialText: string;
  onStarted: (conversation: IAssistantConversation) => void;
}

export function Composer({ conversationId, running, waiting, initialText, onStarted }: ComposerProps) {
  const { t } = useTranslation("modules.assistant.composer");
  const { notify } = useNotifications();
  const { selectedServer } = useServerStore();
  const live = useLiveConversation(conversationId);
  const [text, setText] = useState(initialText);
  const send = useSendMessage(onStarted);
  const stop = useStopConversation();
  const busy = (live.running ?? running) || send.isPending;
  const blocked = busy || waiting;

  const submit = () => {
    const content = text.trim();
    if (!content || blocked) return;
    send.mutate(
      { id: conversationId, content, context: { serverId: selectedServer?.id } },
      {
        onSuccess: () => setText(""),
        onError: (error) => notify({ type: "error", title: getApiErrorMessage(error) }),
      }
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="shrink-0 px-3 pt-1 pb-3">
      <div className="rounded-xl border border-input bg-field transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/18">
        <textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={8000}
          placeholder={waiting ? t("waiting") : t("placeholder")}
          aria-label={t("placeholder")}
          className="block field-sizing-content max-h-48 min-h-[52px] w-full resize-none bg-transparent px-3.5 pt-3 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-2 px-2 pb-2">
          <span
            className="mr-auto inline-flex min-w-0 items-center gap-1.5 rounded-md bg-subtle px-2 py-1 text-[11.5px] text-muted-foreground"
            title={t("contextHint")}
          >
            <Server className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{selectedServer ? t("server", selectedServer.name) : t("noServer")}</span>
          </span>
          {busy && conversationId ? (
            <Button
              size="icon-sm"
              variant="secondary"
              className="rounded-lg"
              aria-label={t("stop")}
              title={t("stop")}
              onClick={() => stop.mutate(conversationId)}
            >
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button size="icon-sm" className="rounded-lg" aria-label={t("send")} title={t("send")} disabled={!text.trim() || blocked} onClick={submit}>
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
