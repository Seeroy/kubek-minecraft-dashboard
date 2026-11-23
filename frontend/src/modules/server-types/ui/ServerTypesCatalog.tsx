"use client";
import { CatalogBrowser, CatalogFact, CatalogFacts, CatalogSection, type CatalogMark } from "@/modules/catalog";
import { sampleItem, sampleResponse } from "@/modules/catalog/lib/samples";
import { useNotifications } from "@/modules/notifications";
import type { CatalogLayout } from "@/modules/plugins/hooks/useCatalogView";
import { useSystemInfoQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
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
const HOST_STEPS = ["exec", "script", "steamcmd"];
// A newer SDK may add steps this panel has no name for, those show the raw type
const KNOWN_STEPS = new Set(["download", "writeFile", "chmod", "template", "script", "exec", "steamcmd", "dockerPull"]);

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

  const details = (item: CatalogBlueprint) => {
    const platforms = item.platforms ?? [];
    return (
      <>
        <CatalogSection title={t("catalog.details.about")}>
          <CatalogFacts>
            <CatalogFact label={t("catalog.details.game")}>{gameTitle({ game: item.game, gameName: item.gameName ?? undefined })}</CatalogFact>
            <CatalogFact label={t("catalog.details.runtime")}>{t(`catalog.details.${item.runtime}`)}</CatalogFact>
            <CatalogFact label={t("catalog.details.platforms")}>
              {platforms.length === 0
                ? t("catalog.details.anyOs")
                : platforms.map((p, i) => (
                    <span key={p} className={host && p === host ? "font-medium" : undefined}>
                      {i > 0 && ", "}
                      {PLATFORM_NAMES[p] ?? p}
                    </span>
                  ))}
              {host && platforms.length > 0 && !platforms.includes(host) && <span className="text-warn"> ({t("catalog.details.notThisOs")})</span>}
            </CatalogFact>
          </CatalogFacts>
        </CatalogSection>
        {item.installSteps.length > 0 && (
          <CatalogSection title={t("catalog.details.install")}>
            <div className="flex flex-wrap gap-1.5">
              {item.installSteps.map((step) => (
                <Badge key={step} variant={HOST_STEPS.includes(step) ? "warning" : "secondary"} title={HOST_STEPS.includes(step) ? t("catalog.hostStepsHint") : undefined}>
                  {HOST_STEPS.includes(step) && <Terminal />}
                  {KNOWN_STEPS.has(step) ? t(`catalog.details.stepNames.${step}`) : step}
                </Badge>
              ))}
            </div>
          </CatalogSection>
        )}
        {item.tags.length > 0 && (
          <CatalogSection title={t("catalog.details.tags")}>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CatalogSection>
        )}
      </>
    );
  };

  return (
    <CatalogBrowser
      id="blueprints"
      kind="blueprints"
      query={catalog}
      view={view}
      icon={Boxes}
      repo="KubekPanel/blueprints"
      sample={SAMPLE}
      marks={marks}
      searchText={(item) => `${item.shortName ?? ""} ${item.gameName ?? item.game} ${item.tags.join(" ")}`}
      details={details}
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
