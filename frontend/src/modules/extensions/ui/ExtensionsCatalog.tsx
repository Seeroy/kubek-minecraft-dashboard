"use client";
import { CatalogBrowser, type CatalogMark } from "@/modules/catalog";
import { sampleItem, sampleResponse } from "@/modules/catalog/lib/samples";
import type { CatalogLayout } from "@/modules/plugins/hooks/useCatalogView";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { Capability } from "@kubekpanel/extension-sdk";
import type { CatalogExtension } from "@shared/types/catalog.types";
import { Blocks, KeyRound, LayoutPanelTop, Server, ShieldAlert } from "lucide-react";
import { useExtensionsCatalog, useInstallExtensionFromCatalogMutation } from "../api/extensions.queries";
import { RISKY } from "./ExtensionRow";

const SAMPLE = sampleResponse<CatalogExtension>(
  ["Discord bridge", "Server stats", "Auto restart", "Webhooks"].map((name, i) => ({
    ...sampleItem(i + 1, name),
    keywords: [],
    capabilities: ["events:server"],
    hasBackend: true,
    hasFrontend: true,
  }))
);

interface ExtensionsCatalogProps {
  view: CatalogLayout;
  canInstall: boolean;
  /** Fresh installs land on the installed tab with the access request open */
  onInstalled: (id: string) => void;
}

export function ExtensionsCatalog({ view, canInstall, onInstalled }: ExtensionsCatalogProps) {
  const { t } = useTranslation("modules.extensions");
  const { notify } = useNotifications();
  const catalog = useExtensionsCatalog();
  const install = useInstallExtensionFromCatalogMutation();

  const marks = (item: CatalogExtension): CatalogMark[] => {
    const caps = item.capabilities as Capability[];
    const risky = caps.filter((cap) => RISKY.has(cap));
    return [
      ...risky.map((cap) => ({ key: cap, label: t(`capabilities.${cap}.label`), warning: true, icon: ShieldAlert, title: t(`capabilities.${cap}.hint`) })),
      ...(caps.length
        ? [{ key: "caps", label: t("catalog.permissions", caps.length), icon: KeyRound, title: caps.map((cap) => t(`capabilities.${cap}.label`)).join(", ") }]
        : []),
      ...(item.hasBackend ? [{ key: "backend", label: t("catalog.backend"), tone: "purple" as const, icon: Server }] : []),
      ...(item.hasFrontend ? [{ key: "frontend", label: t("catalog.frontend"), tone: "blue" as const, icon: LayoutPanelTop }] : []),
    ];
  };

  return (
    <CatalogBrowser
      id="extensions"
      query={catalog}
      view={view}
      icon={Blocks}
      repo="KubekPanel/extensions"
      sample={SAMPLE}
      marks={marks}
      searchText={(item) => item.keywords.join(" ")}
      install={
        canInstall
          ? async (item) => {
              const wasInstalled = !!item.installedVersion;
              const result = await install.mutateAsync(item.id);
              notify({ type: "success", title: t(wasInstalled ? "toasts.updated" : "toasts.installed", result.manifest.name) });
              if (!wasInstalled) onInstalled(result.id);
            }
          : undefined
      }
    />
  );
}
