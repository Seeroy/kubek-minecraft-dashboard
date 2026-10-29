"use client";

import type { ContentKind } from "@/api";
import { useServerStore, type Server } from "@/modules/server";
import { useBlueprint, useBlueprints } from "@/modules/server-types/api/server-types.queries";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useInstalledContent } from "@/shared/queries";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Globe, Puzzle, RotateCw, Search, Server as ServerIcon, ServerOff, Upload } from "lucide-react";
import { useRef } from "react";
import { getContentKind } from "../content-kind";
import { useContentTaskSync } from "../hooks/useContentTaskSync";
import { useContentUpload } from "../hooks/useContentUpload";
import { CONTENT_TABS, type ContentTab } from "../lib/tabs";
import { CatalogView } from "./CatalogView";
import { InstalledView } from "./InstalledView";

function Unsupported({ kind, server }: { kind: ContentKind; server: Server }) {
  const config = getContentKind(kind);
  const { t } = useTranslation(`${config.i18nNs}.notAvailable`);
  const { servers, selectServer } = useServerStore();
  const { data: blueprints } = useBlueprints();
  const alternative = servers.find((s) => config.isAvailable(blueprints?.find((b) => b.id === s.blueprintId)));

  return (
    <Empty className="rounded-lg border border-border bg-card py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Puzzle />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{t("description", server.name)}</EmptyDescription>
      </EmptyHeader>
      {alternative && (
        <EmptyContent>
          <Button onClick={() => selectServer(alternative.id)}>{t("switchTo", alternative.name)}</Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

function ServerContent({ kind, server }: { kind: ContentKind; server: Server }) {
  const config = getContentKind(kind);
  const { t } = useTranslation(config.i18nNs);
  const { t: tc } = useTranslation("modules.content");
  const blueprint = useBlueprint(server.blueprintId);
  const blueprintsLoading = useBlueprints().isLoading;
  const available = config.isAvailable(blueprint);
  const [tab, changeTab] = useRouteTab(kind === "mod" ? "/mods" : "/plugins", CONTENT_TABS, "installed");
  const fileInput = useRef<HTMLInputElement>(null);

  const installed = useInstalledContent(kind, available ? server.id : undefined);
  useContentTaskSync(kind, server.id);
  const upload = useContentUpload({
    serverId: server.id,
    folder: config.installFolder,
    t,
    onComplete: () => void installed.refetch(),
  });

  const refreshing = installed.isFetching && !installed.isLoading;

  return (
    <div
      className="stagger-enter min-h-full"
      onDragEnter={available ? upload.handleDragEnter : undefined}
      onDragLeave={upload.handleDragLeave}
      onDragOver={available ? upload.handleDragOver : undefined}
      onDrop={available ? upload.handleDrop : undefined}
    >
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <input ref={fileInput} type="file" accept=".jar" multiple hidden onChange={upload.handleInputChange} />
            <Button variant="outline" disabled={!available || upload.isUploading} onClick={() => fileInput.current?.click()}>
              {upload.isUploading ? <Spinner /> : <Upload />}
              {upload.isUploading ? tc("actions.uploading") : tc("actions.upload")}
            </Button>
            <Button variant="outline" disabled={!available || refreshing} onClick={() => void installed.refetch()}>
              <RotateCw className={refreshing ? "animate-spin" : undefined} />
              {refreshing ? tc("actions.refreshing") : tc("actions.refresh")}
            </Button>
          </>
        }
      />

      {blueprintsLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : !available ? (
        <Unsupported kind={kind} server={server} />
      ) : (
        <Tabs value={tab} onValueChange={(value) => changeTab(value as ContentTab)} className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="installed">
                <ServerIcon />
                {tc("tabs.installed")}
                {installed.data && <TabsCount>{installed.data.length}</TabsCount>}
              </TabsTrigger>
              <TabsTrigger value="available">
                <Search />
                {tc("tabs.available")}
              </TabsTrigger>
            </TabsList>
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground max-sm:hidden">
              <Globe className="size-3.5" />
              {tc("source", config.loaderLabel)}
            </span>
          </div>
          <TabsContent value="installed">
            <InstalledView
              kind={kind}
              server={server}
              items={installed.data}
              loading={installed.isLoading}
              onOpenCatalog={() => changeTab("available")}
            />
          </TabsContent>
          <TabsContent value="available">
            <CatalogView kind={kind} server={server} installed={installed.data} />
          </TabsContent>
        </Tabs>
      )}

      {upload.isDragOver && (
        <div className="pointer-events-none fixed inset-0 z-90 grid place-items-center border-2 border-dashed border-primary/60 bg-background/80 backdrop-blur-sm">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Upload />
              </EmptyMedia>
              <EmptyTitle>{t("upload.drop")}</EmptyTitle>
              <EmptyDescription>{tc("dropTarget", config.installFolder, server.name)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}
    </div>
  );
}

export default function ContentDashboard({ kind }: { kind: ContentKind }) {
  const { t } = useTranslation(getContentKind(kind).i18nNs);
  const { t: tc } = useTranslation("modules.content");
  const { selectedServer } = useServerStore();

  if (!selectedServer) {
    return (
      <div className="stagger-enter">
        <PageHeader title={t("title")} description={t("description")} />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerOff />
            </EmptyMedia>
            <EmptyTitle>{tc("noServer.title")}</EmptyTitle>
            <EmptyDescription>{tc("noServer.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // Keyed so search and filters reset on a server switch
  return <ServerContent key={selectedServer.id} kind={kind} server={selectedServer} />;
}
