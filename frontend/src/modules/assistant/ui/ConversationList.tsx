"use client";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Skeleton } from "@/shared/ui/skeleton";
import { MessagesSquare, Trash2 } from "lucide-react";
import { useConversationsQuery, useDeleteConversation } from "../api/assistant.queries";
import { useAssistantPanel } from "../lib/panel-store";

export function ConversationList() {
  const { t } = useTranslation("modules.assistant.list");
  const activeId = useAssistantPanel((s) => s.conversationId);
  const showConversation = useAssistantPanel((s) => s.showConversation);
  const { servers } = useServerStore();
  const list = useConversationsQuery(true);
  const remove = useDeleteConversation();

  if (list.isPending) {
    return (
      <div className="grid gap-2 p-3" aria-busy>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

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

  if (list.data.length === 0) {
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

  return (
    <ul className="grid scrollbar-thin min-h-0 flex-1 content-start gap-0.5 overflow-y-auto overscroll-contain p-2">
      {list.data.map((conversation) => {
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
              className="mr-1.5 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
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
  );
}
