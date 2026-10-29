"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { IAssistantMessage } from "@shared/types/assistant.types";
import { CircleAlert } from "lucide-react";
import { memo } from "react";
import { ConfirmCard } from "./ConfirmCard";
import { Markdown } from "./Markdown";
import { ToolCallCard } from "./ToolCallCard";

interface MessageItemProps {
  message: IAssistantMessage;
  serverName: (id: string | null) => string | undefined;
}

export const MessageItem = memo(function MessageItem({ message, serverName }: MessageItemProps) {
  const { t } = useTranslation("modules.assistant.chat");

  if (message.role === "user") {
    return (
      <div className="ml-10 self-end rounded-xl rounded-br-[5px] bg-primary/10 px-3.5 py-2 text-[13px] leading-relaxed break-words whitespace-pre-wrap">
        {message.content}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {message.content && <Markdown text={message.content} />}
      {message.toolCalls.map((call) =>
        call.status === "pending" ? (
          <ConfirmCard key={call.id} conversationId={message.conversationId} call={call} serverName={serverName(call.serverId)} />
        ) : (
          <ToolCallCard key={call.id} call={call} />
        )
      )}
      {message.error && (
        <div className="flex items-start gap-2 text-xs text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{message.error === "Stopped" ? t("stopped") : message.error}</span>
        </div>
      )}
    </div>
  );
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
