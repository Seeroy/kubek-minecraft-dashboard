"use client";
import { useServerStore } from "@/modules/server/contexts/server-context";
import { resolveServerStatus, useServerLive } from "@/modules/server/store/server-statuses.store";
import type { Server } from "@/modules/server/types";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ApiError } from "@/shared/lib/http";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { Stat, StatStrip } from "@/shared/ui/stat-strip";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ServerStatus } from "@shared/types/server/server.types";
import { Ban, Crown, ListChecks, Radio, RotateCw, ServerOff, TriangleAlert, UsersRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { usePlayersOverview } from "../api/players.queries";
import { usePlayerActions } from "../hooks/usePlayerActions";
import { usePlayersAccess } from "../hooks/usePlayersAccess";
import { PLAYERS_TABS, type PlayersTab } from "../lib/players";
import { BansTab } from "./BansTab";
import { OnlineTab } from "./OnlineTab";
import { OpsTab } from "./OpsTab";
import { WhitelistTab } from "./WhitelistTab";

const TAB_ICONS: Record<PlayersTab, LucideIcon> = {
  online: Radio,
  whitelist: ListChecks,
  ops: Crown,
  bans: Ban,
};

function Unavailable({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <Empty className="rounded-lg border border-border bg-card py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

function ServerPlayers({ server }: { server: Server }) {
  const { t } = useTranslation("modules.players");
  const access = usePlayersAccess(server.id, server.blueprintId);
  const status = useServerLive(server.id);
  const state = resolveServerStatus(status, server.status);
  const query = usePlayersOverview(server.id, access.supported && access.canView);
  const actions = usePlayerActions(server.id);
  const [tab, setTab] = useRouteTab<PlayersTab>("/players", PLAYERS_TABS, "online");

  const overview = query.data;
  const busy = state === ServerStatus.STARTING || state === ServerStatus.STOPPING;
  // The status store keeps the last sample after a stop, so players only count while running
  const online = state === ServerStatus.RUNNING ? (status?.players?.list ?? []) : null;
  const unsupported = !access.supported || (query.error instanceof ApiError && query.error.code === "PLAYERS_UNSUPPORTED");

  const counts: Record<PlayersTab, number | undefined> = {
    online: online?.length,
    whitelist: overview?.whitelist.length,
    ops: overview?.ops.length,
    bans: overview && overview.bans.length + overview.ipBans.length,
  };

  const header = <PageHeader title={t("title")} description={t("description")} />;

  if (unsupported) {
    return (
      <>
        {header}
        <Unavailable icon={ServerOff} title={t("unsupported.title")} description={t("unsupported.description")} />
      </>
    );
  }

  const tabProps = overview && { serverId: server.id, overview, busy, access, actions };

  return (
    <>
      {header}
      {/* minmax(0) so the tabs don't stretch the page on mobile */}
      <div className="grid gap-4 max-md:grid-cols-[minmax(0,1fr)]">
        <StatStrip className="max-sm:grid-cols-2 max-sm:*:data-[slot=stat]:p-3 max-sm:**:data-[slot=stat-value]:text-xl">
          <Stat
            label={t("stats.online")}
            icon={<Radio />}
            tone="green"
            value={online ? (status?.players?.online ?? online.length) : "—"}
            unit={online && status?.players?.max ? ` / ${status.players.max}` : undefined}
          />
          <Stat
            label={t("stats.whitelist")}
            icon={<ListChecks />}
            tone="blue"
            value={overview?.whitelist.length ?? "—"}
            unit={overview && !overview.settings.whitelist ? t("stats.whitelistOff") : undefined}
          />
          <Stat label={t("stats.ops")} icon={<Crown />} tone="amber" value={overview?.ops.length ?? "—"} />
          <Stat
            label={t("stats.bans")}
            icon={<Ban />}
            tone="red"
            value={overview?.bans.length ?? "—"}
            unit={overview?.ipBans.length ? t("stats.ipBans", overview.ipBans.length) : undefined}
          />
        </StatStrip>

        <Tabs value={tab} onValueChange={(value) => setTab(value as PlayersTab)} className="gap-4">
          <div className="w-fit max-w-full">
            <TabsList>
              {PLAYERS_TABS.map((id) => {
                const Icon = TAB_ICONS[id];
                return (
                  <TabsTrigger key={id} value={id}>
                    <Icon />
                    {t(`tabs.${id}`)}
                    {counts[id] ? <TabsCount>{counts[id]}</TabsCount> : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="online">
            <OnlineTab online={online} overview={overview} access={access} actions={actions} />
          </TabsContent>

          {query.isError && !overview ? (
            tab !== "online" && (
              <Unavailable
                icon={TriangleAlert}
                title={t("loadFailed")}
                action={
                  <Button variant="outline" onClick={() => void query.refetch()}>
                    <RotateCw />
                    {t("retry")}
                  </Button>
                }
              />
            )
          ) : !tabProps ? (
            tab !== "online" && <Skeleton className="h-80 rounded-lg" />
          ) : (
            <>
              <TabsContent value="whitelist">
                <WhitelistTab {...tabProps} />
              </TabsContent>
              <TabsContent value="ops">
                <OpsTab {...tabProps} />
              </TabsContent>
              <TabsContent value="bans">
                <BansTab {...tabProps} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </>
  );
}

export default function Players() {
  const { t } = useTranslation("modules.players");
  const { selectedServer } = useServerStore();

  return (
    <div className="stagger-enter">
      {selectedServer ? (
        // Keyed so forms and filters reset on a server switch
        <ServerPlayers key={selectedServer.id} server={selectedServer} />
      ) : (
        <>
          <PageHeader title={t("title")} description={t("description")} />
          <Unavailable icon={UsersRound} title={t("noServer.title")} description={t("noServer.description")} />
        </>
      )}
    </div>
  );
}
