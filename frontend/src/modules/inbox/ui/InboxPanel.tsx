"use client";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type { INotification } from "@shared/types/notification.types";
import { BellOff, CheckCheck, Inbox, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDeleteNotificationMutation, useInboxQuery, useMarkAllReadMutation, useMarkReadMutation } from "../api/inbox.queries";
import { SAMPLE_NOTIFICATIONS } from "../data/samples";
import { useDescribeNotification } from "../lib/describe";
import { InboxRow } from "./InboxRow";

type Filter = "all" | "unread";

// Page sized tabs are too tall for the popover header
const COMPACT_TAB = "h-7 rounded-[7px] px-2.5 text-[12.5px]";

export function InboxPanel({ onOpenSettings, onNavigate }: { onOpenSettings: () => void; onNavigate: () => void }) {
  const { t } = useTranslation("modules.inbox");
  const [filter, setFilter] = useState<Filter>("all");
  const inbox = useInboxQuery(filter === "unread");
  const markAll = useMarkAllReadMutation();
  const unreadCount = inbox.data?.pages[0]?.unreadCount ?? 0;

  return (
    <div className="flex max-h-[min(520px,calc(100dvh-96px))] flex-col">
      <header className="flex items-center gap-2 border-b border-border p-2.5">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)} className="min-w-0 flex-1">
          <TabsList className="p-0.5">
            <TabsTrigger value="all" className={COMPACT_TAB}>
              {t("filters.all")}
            </TabsTrigger>
            <TabsTrigger value="unread" className={COMPACT_TAB}>
              {t("filters.unread")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("markAllRead")}
            title={t("markAllRead")}
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() => markAll.mutate(undefined)}
          >
            <CheckCheck />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={t("settings")} title={t("settings")} onClick={onOpenSettings}>
            <Settings2 />
          </Button>
        </div>
      </header>
      <InboxBody inbox={inbox} unreadOnly={filter === "unread"} onNavigate={onNavigate} />
    </div>
  );
}

function InboxBody({ inbox, unreadOnly, onNavigate }: { inbox: ReturnType<typeof useInboxQuery>; unreadOnly: boolean; onNavigate: () => void }) {
  const { t } = useTranslation("modules.inbox");
  const describe = useDescribeNotification();
  const markRead = useMarkReadMutation();
  const remove = useDeleteNotificationMutation();
  const { selectServer } = useServerStore();
  const router = useRouter();

  if (inbox.isError) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-[13px] text-muted-foreground">
        {t("loadError")}
        <Button variant="outline" size="sm" onClick={() => void inbox.refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  const items = inbox.data?.pages.flatMap((page) => page.items) ?? [];
  if (!inbox.isPending && items.length === 0) {
    const key = unreadOnly ? "emptyUnread" : "empty";
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">{unreadOnly ? <Inbox /> : <BellOff />}</EmptyMedia>
          <EmptyTitle>{t(`${key}.title`)}</EmptyTitle>
          <EmptyDescription>{t(`${key}.description`)}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const open = (notification: INotification, { serverId, href }: { serverId?: string; href?: string }) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    if (serverId) {
      selectServer(serverId);
      router.push(href ?? "/console");
    } else if (href) {
      router.push(href);
    } else {
      return;
    }
    onNavigate();
  };

  return (
    <div className="scrollbar-thin min-h-0 overflow-y-auto overscroll-contain">
      <DataReveal id="inbox" data={items} loading={inbox.isPending} sample={SAMPLE_NOTIFICATIONS}>
        {(items) => (
          <ul className="divide-y divide-border">
            {items.map((notification) => {
              const view = describe(notification);
              return (
                <InboxRow
                  key={notification.id}
                  notification={notification}
                  view={view}
                  onOpen={() => open(notification, view)}
                  onRemove={() => remove.mutate(notification.id)}
                />
              );
            })}
          </ul>
        )}
      </DataReveal>
      {inbox.hasNextPage && (
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full" disabled={inbox.isFetchingNextPage} onClick={() => void inbox.fetchNextPage()}>
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
