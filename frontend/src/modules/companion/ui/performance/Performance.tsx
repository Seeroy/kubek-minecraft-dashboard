"use client";

import type { CompanionMetricsWindow } from "@/api";
import { useServerStore } from "@/modules/server/contexts/server-context";
import type { Server } from "@/modules/server/types";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { PageHeader } from "@/shared/ui/page-header";
import { LoadReveal } from "@/shared/ui/data-reveal";
import { LoadError } from "@/shared/ui/load-error";
import { Skeleton } from "@/shared/ui/skeleton";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { Gauge } from "lucide-react";
import { useState } from "react";
import { useCompanion } from "../../hooks/useCompanion";
import { CompanionBanner } from "../CompanionBanner";
import { CompanionRequired } from "../CompanionRequired";
import { JvmPanel } from "./JvmPanel";
import { LagReportPanel } from "./LagReportPanel";
import { MetricCharts } from "./MetricCharts";
import { PerformanceStats } from "./PerformanceStats";
import { WorldsPanel } from "./WorldsPanel";

const WINDOWS: CompanionMetricsWindow[] = ["1h", "6h", "24h", "7d"];
const WINDOW_KEY = "kubek:companion-window";

const readWindow = (): CompanionMetricsWindow => {
  try {
    const saved = localStorage.getItem(WINDOW_KEY) as CompanionMetricsWindow | null;
    return saved && WINDOWS.includes(saved) ? saved : "1h";
  } catch {
    return "1h";
  }
};

function ServerPerformance({ server }: { server: Server }) {
  const { t } = useTranslation("modules.companion.performance");
  const { state, live, failed, retry, retrying } = useCompanion(server.id);
  const [window, setWindow] = useState<CompanionMetricsWindow>(readWindow);
  const usable = state === "connected" || state === "waiting" || state === "offline";

  const changeWindow = (next: CompanionMetricsWindow) => {
    setWindow(next);
    try {
      localStorage.setItem(WINDOW_KEY, next);
    } catch {
      // Remembering the window is a convenience only
    }
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          usable && (
            <ToggleGroup variant="segmented" value={[window]} onValueChange={(next) => next[0] && changeWindow(next[0] as CompanionMetricsWindow)} aria-label={t("window")}>
              {WINDOWS.map((key) => (
                <Toggle key={key} variant="segmented" value={key}>
                  {key}
                </Toggle>
              ))}
            </ToggleGroup>
          )
        }
      />

      {failed ? (
        <LoadError onRetry={retry} retrying={retrying} />
      ) : state !== "loading" && !usable ? (
        <CompanionRequired serverId={server.id} description={t("required")} />
      ) : (
        // minmax(0) so wide tables scroll instead of stretching the page on mobile
        <LoadReveal
          loading={state === "loading"}
          className="grid gap-4 max-md:grid-cols-[minmax(0,1fr)]"
          skeleton={
            <>
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-80 rounded-lg" />
            </>
          }
        >
          <CompanionBanner serverId={server.id} section="performance" />
          <PerformanceStats stats={state === "connected" ? (live?.stats ?? null) : null} />
          <MetricCharts serverId={server.id} window={window} />
          {state === "connected" && live && (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
              <WorldsPanel worlds={live.stats?.worlds ?? []} />
              <JvmPanel live={live} />
            </div>
          )}
          <LagReportPanel serverId={server.id} state={state} />
        </LoadReveal>
      )}
    </>
  );
}

export function Performance() {
  const { t } = useTranslation("modules.companion.performance");
  const { selectedServer } = useServerStore();

  return (
    <div className="stagger-enter">
      {selectedServer ? (
        // Keyed so a lag report from another server never shows up here
        <ServerPerformance key={selectedServer.id} server={selectedServer} />
      ) : (
        <>
          <PageHeader title={t("title")} description={t("description")} />
          <Empty className="rounded-lg border border-border bg-card py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Gauge />
              </EmptyMedia>
              <EmptyTitle>{t("noServer.title")}</EmptyTitle>
              <EmptyDescription>{t("noServer.description")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </>
      )}
    </div>
  );
}
