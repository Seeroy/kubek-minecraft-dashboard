"use client";
import { useCompanion } from "@/modules/companion";
import { usePlayerEvents } from "@/modules/companion/api/companion.queries";
import { EventRow } from "@/modules/companion/ui/players/EventRow";
import { CompanionRequired } from "@/modules/companion";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { History, LogIn, LogOut } from "lucide-react";
import { formatDate } from "../../lib/players";
import { DetailsSection } from "./DetailsSection";
import { IconLabel } from "./IconLabel";

function LastEvent({ serverId, uuid, type }: { serverId: string; uuid: string; type: "join" | "quit" }) {
  const { t } = useTranslation("modules.players.details.activity");
  const query = usePlayerEvents(serverId, uuid, [type], 1);
  const event = query.data?.pages[0]?.items[0];
  return (
    <KeyValueItem
      label={
        type === "join" ? (
          <IconLabel icon={LogIn} tone="green">
            {t("lastJoin")}
          </IconLabel>
        ) : (
          <IconLabel icon={LogOut} tone="gray">
            {t("lastQuit")}
          </IconLabel>
        )
      }
    >
      {query.isLoading ? <Skeleton className="ml-auto h-4 w-24" /> : event ? formatDate(event.ts) : t("never")}
    </KeyValueItem>
  );
}

export function PlayerActivity({ serverId, uuid }: { serverId: string; uuid: string }) {
  const { t } = useTranslation("modules.players.details.activity");
  const { state } = useCompanion(serverId);
  const feed = usePlayerEvents(serverId, uuid);
  const events = feed.data?.pages.flatMap((page) => page.items) ?? [];

  if (state === "missing" || state === "unsupported") {
    return <CompanionRequired serverId={serverId} description={t("required")} className="border-0 py-6" />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-x-8">
      <KeyValue className="content-start">
        <LastEvent serverId={serverId} uuid={uuid} type="join" />
        <LastEvent serverId={serverId} uuid={uuid} type="quit" />
      </KeyValue>
      <DetailsSection title={t("history")} icon={History} tone="blue">
        {feed.isLoading ? (
          <Skeleton className="h-32" />
        ) : events.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="grid gap-2">
            <ul className="-mx-4 divide-y divide-border">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
            {feed.hasNextPage && (
              <Button variant="outline" size="sm" className="justify-self-center" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>
                {feed.isFetchingNextPage && <Spinner />}
                {t("more")}
              </Button>
            )}
          </div>
        )}
      </DetailsSection>
    </div>
  );
}
