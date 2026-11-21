"use client";
import { CatalogBrowser, type CatalogMark } from "@/modules/catalog";
import { sampleItem, sampleResponse } from "@/modules/catalog/lib/samples";
import { useNotifications } from "@/modules/notifications";
import type { CatalogLayout } from "@/modules/plugins/hooks/useCatalogView";
import { useSystemInfoQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { CatalogBlueprint } from "@shared/types/catalog.types";
import { Boxes, Container, Gamepad2, Monitor, Terminal } from "lucide-react";
import { useBlueprintsCatalog, useInstallBlueprintFromCatalogMutation } from "../api/server-types.queries";
import { gameTitle } from "../lib/blueprint";

const SAMPLE = sampleResponse<CatalogBlueprint>(
  ["Terraria", "SA-MP", "Valheim", "Factorio"].map((name, i) => ({
    ...sampleItem(i + 1, name),
    shortName: null,
    game: "sample",
    gameName: name,
    tags: [],
    platforms: null,
    runtime: "native",
    installSteps: ["download"],
  }))
);

// These run programs on the host while installing, worth a second look
const HOST_STEPS = ["exec", "steamcmd"];

const PLATFORM_NAMES: Record<string, string> = { linux: "Linux", win32: "Windows", darwin: "macOS" };

export function ServerTypesCatalog({ view, canInstall }: { view: CatalogLayout; canInstall: boolean }) {
  const { t } = useTranslation("modules.serverTypes");
  const { notify } = useNotifications();
  const catalog = useBlueprintsCatalog();
  const install = useInstallBlueprintFromCatalogMutation();
  const host = useSystemInfoQuery().data?.platform;

  const marks = (item: CatalogBlueprint): CatalogMark[] => {
    const platforms = item.platforms ?? [];
    const unsupported = !!host && platforms.length > 0 && !platforms.includes(host);
    const steps = item.installSteps.filter((step) => HOST_STEPS.includes(step));
    return [
      ...(unsupported
        ? [{ key: "os", label: t("catalog.otherOs"), warning: true, icon: Monitor, title: platforms.map((p) => PLATFORM_NAMES[p] ?? p).join(", ") }]
        : []),
      ...steps.map((step) => ({ key: step, label: t(`catalog.steps.${step}`), warning: true, icon: Terminal, title: t("catalog.hostStepsHint") })),
      { key: "game", label: gameTitle({ game: item.game, gameName: item.gameName ?? undefined }), tone: "green" as const, icon: Gamepad2 },
      ...(item.runtime === "docker" ? [{ key: "docker", label: "Docker", tone: "cyan" as const, icon: Container }] : []),
      ...(!unsupported && platforms.length
        ? [{ key: "platforms", label: platforms.map((p) => PLATFORM_NAMES[p] ?? p).join(", "), icon: Monitor }]
        : []),
    ];
  };

  return (
    <CatalogBrowser
      id="blueprints"
      query={catalog}
      view={view}
      icon={Boxes}
      repo="KubekPanel/blueprints"
      sample={SAMPLE}
      marks={marks}
      searchText={(item) => `${item.shortName ?? ""} ${item.gameName ?? item.game} ${item.tags.join(" ")}`}
      install={
        canInstall
          ? async (item) => {
              const wasInstalled = !!item.installedVersion;
              const result = await install.mutateAsync(item.id);
              notify({ type: "success", title: t(wasInstalled ? "toasts.updated" : "toasts.installed", result.name) });
            }
          : undefined
      }
    />
  );
}
