"use client";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { MessagesSquare, Trash2 } from "lucide-react";
import { useConversationsQuery, useDeleteConversation } from "../api/assistant.queries";
import { SAMPLE_CONVERSATIONS } from "../data/samples";
import { useAssistantPanel } from "../lib/panel-store";

export function ConversationList() {
  const { t } = useTranslation("modules.assistant.list");
  const activeId = useAssistantPanel((s) => s.conversationId);
  const showConversation = useAssistantPanel((s) => s.showConversation);
  const { servers } = useServerStore();
  const list = useConversationsQuery(true);
  const remove = useDeleteConversation();

  if (list.isError) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[13px] text-muted-foreground">
        {t("loadError")}
        <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!list.isPending && list.data.length === 0) {
    return (
      <Empty className="flex-1 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessagesSquare />
          </EmptyMedia>
          <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // The wrapper scrolls, skullet puts its own panes between it and the list
  return (
    <DataReveal
      id="assistant-conversations"
      data={list.data}
      sample={SAMPLE_CONVERSATIONS}
      className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      {(conversations) => (
        <ul className="grid grid-cols-[minmax(0,1fr)] content-start gap-0.5 p-2">
          {conversations.map((conversation) => {
            const server = servers.find((s) => s.id === conversation.serverId)?.name;
            return (
              <li
                key={conversation.id}
                className="group/row relative flex items-center rounded-lg transition-colors hover:bg-hover has-aria-[current=true]:bg-primary/8"
              >
                <button
                  type="button"
                  aria-current={conversation.id === activeId}
                  className="min-w-0 flex-1 px-3 py-2 text-left"
                  onClick={() => showConversation(conversation.id)}
                >
                  <span className="block truncate text-[13px] font-medium">{conversation.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatRelative(conversation.updatedAt, t("justNow"))}
                    {server && ` · ${server}`}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="mr-1.5 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                  aria-label={t("remove")}
                  title={t("remove")}
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(conversation.id, { onSuccess: () => conversation.id === activeId && useAssistantPanel.setState({ conversationId: null }) })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </DataReveal>
  );
}
