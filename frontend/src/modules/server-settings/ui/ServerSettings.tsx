"use client";

import { useServerStore, type Server } from "@/modules/server";
import { SaveConfirmationModalRegistration } from "@/modules/server-settings/modals/SaveConfirmationModal";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { settingsTabAllowedByBlueprint } from "@/shared/lib/serverRestrictions";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { PageHeader } from "@/shared/ui/page-header";
import { SaveBar } from "@/shared/ui/settings";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsCount, TabsList, TabsSeparator, TabsTrigger } from "@/shared/ui/tabs";
import { AccessArea } from "@shared/access/areas";
import { BookMarked, Coffee, Earth, GamepadDirectional, Network, RectangleEllipsis, RotateCw, Server as ServerIcon, ServerOff, TriangleAlert, Waypoints, type LucideIcon } from "lucide-react";
import { Fragment } from "react";
import { NetworkTab } from "@/modules/networks/ui/NetworkTab";
import { useSettingsDraft } from "../hooks/useSettingsDraft";
import type { SettingsTab } from "../lib/schema";
import { SERVER_SETTINGS_TABS } from "../lib/tabs";
import { GeneralTab } from "./GeneralTab";
import { JavaTab } from "./JavaTab";
import { OtherPropertiesTab } from "./OtherPropertiesTab";
import { PropertyGroups } from "./PropertyGroups";


const TABS: { id: SettingsTab; icon: LucideIcon; separatorBefore?: boolean }[] = [
  { id: "general", icon: ServerIcon },
  { id: "java", icon: Coffee },
  { id: "information", icon: BookMarked, separatorBefore: true },
  { id: "gameplay", icon: GamepadDirectional },
  { id: "world", icon: Earth },
  { id: "network", icon: Network },
  { id: "other", icon: RectangleEllipsis },
  { id: "velocity", icon: Waypoints, separatorBefore: true },
];

function ServerSettingsForm({ server }: { server: Server }) {
  const { t } = useTranslation("modules.serverSettings.tabs");
  const { t: tState } = useTranslation("modules.serverSettings.state");
  const blueprint = useBlueprint(server.blueprintId);
  const draft = useSettingsDraft(server);
  const [tab, changeTab] = useRouteTab<SettingsTab>("/server-settings", SERVER_SETTINGS_TABS, "general");
  const canWrite = useAccess([AccessArea.SETTINGS, "write"], server.id);
  const canSeeNetwork = useAccess([AccessArea.NETWORKS, "read"]);

  // The blueprint decides which tabs this core supports
  const allowed = (id: SettingsTab) => (id !== "velocity" || canSeeNetwork) && (!blueprint || settingsTabAllowedByBlueprint(id, blueprint));
  const tabs = TABS.filter((item) => allowed(item.id));
  const active = tabs.some((item) => item.id === tab) ? tab : "general";

  return (
    <Tabs value={active} onValueChange={(value) => changeTab(value as SettingsTab)} className="gap-5">
      <div className="sticky top-0 z-10 w-fit max-w-full rounded-lg bg-background">
        <TabsList>
          {tabs.map(({ id, icon: Icon, separatorBefore }) => (
            <Fragment key={id}>
              {separatorBefore && <TabsSeparator />}
              <TabsTrigger value={id}>
                <Icon />
                {t(id)}
                {draft.counts[id] ? <TabsCount>{draft.counts[id]}</TabsCount> : null}
              </TabsTrigger>
            </Fragment>
          ))}
        </TabsList>
      </div>

      {/* The network does not live in server.properties, proxies have none */}
      {active === "velocity" ? (
        <TabsContent value="velocity">
          <NetworkTab serverId={server.id} />
        </TabsContent>
      ) : draft.loading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : draft.loadFailed ? (
        <Empty className="rounded-lg border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlert />
            </EmptyMedia>
            <EmptyTitle>{tState("loadFailed")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => void draft.retry()}>
              <RotateCw />
              {tState("retry")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        // Without write the settings stay readable but locked
        <fieldset disabled={!canWrite} className="contents">
          <TabsContent value="general">
            <GeneralTab server={server} draft={draft} />
          </TabsContent>
          <TabsContent value="java">
            <JavaTab server={server} draft={draft} />
          </TabsContent>
          {(["information", "gameplay", "world", "network"] as const).map((id) => (
            <TabsContent key={id} value={id}>
              <PropertyGroups tab={id} draft={draft} server={server} />
            </TabsContent>
          ))}
          <TabsContent value="other">
            <OtherPropertiesTab draft={draft} />
          </TabsContent>
        </fieldset>
      )}

      {canWrite && <SaveBar count={draft.total} saving={draft.saving} onSave={draft.save} onReset={draft.reset} />}
    </Tabs>
  );
}

export function ServerSettings() {
  const { t } = useTranslation("modules.serverSettings");
  const { selectedServer } = useServerStore();

  return (
    <div className="stagger-enter">
      <PageHeader title={t("header.title")} description={t("header.description")} />
      {selectedServer ? (
        // Keyed so drafts never leak between servers
        <ServerSettingsForm key={selectedServer.id} server={selectedServer} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerOff />
            </EmptyMedia>
            <EmptyTitle>{t("general.noServerSelected")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      <SaveConfirmationModalRegistration />
    </div>
  );
}
