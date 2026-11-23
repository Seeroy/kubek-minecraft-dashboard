"use client";
import { CatalogBrowser, CatalogSection, type CatalogMark } from "@/modules/catalog";
import { sampleItem, sampleResponse } from "@/modules/catalog/lib/samples";
import type { CatalogLayout } from "@/modules/plugins/hooks/useCatalogView";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
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

  const details = (item: CatalogExtension) => {
    const caps = item.capabilities as Capability[];
    const parts = [
      item.hasBackend && { key: "backend", icon: Server, label: t("catalog.backend"), hint: t("catalog.details.backendHint") },
      item.hasFrontend && { key: "frontend", icon: LayoutPanelTop, label: t("catalog.frontend"), hint: t("catalog.details.frontendHint") },
    ].filter((part) => !!part);
    return (
      <>
        <CatalogSection title={t("access.title")}>
          {caps.length === 0 ? (
            <p className="text-muted-foreground">{t("access.none")}</p>
          ) : (
            <ul className="grid gap-2.5">
              {caps.map((cap) => (
                <li key={cap} className="grid grid-cols-[16px_minmax(0,1fr)] gap-2.5">
                  {RISKY.has(cap) ? <ShieldAlert className="mt-0.5 size-4 text-warn" /> : <KeyRound className="mt-0.5 size-4 text-muted-foreground" />}
                  <span>
                    <span className="flex flex-wrap items-center gap-1.5 font-medium">
                      {t(`capabilities.${cap}.label`)}
                      {RISKY.has(cap) && <Badge variant="warning">{t("access.risky")}</Badge>}
                    </span>
                    <small className="block text-[12px] text-muted-foreground">
                      <span className="font-mono">{cap}</span> · {t(`capabilities.${cap}.hint`)}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CatalogSection>
        {parts.length > 0 && (
          <CatalogSection title={t("catalog.details.parts")}>
            <ul className="grid gap-2.5">
              {parts.map(({ key, icon: Icon, label, hint }) => (
                <li key={key} className="grid grid-cols-[16px_minmax(0,1fr)] gap-2.5">
                  <Icon className="mt-0.5 size-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">{label}</span>
                    <small className="block text-[12px] text-muted-foreground">{hint}</small>
                  </span>
                </li>
              ))}
            </ul>
          </CatalogSection>
        )}
        {item.keywords.length > 0 && (
          <CatalogSection title={t("catalog.details.keywords")}>
            <div className="flex flex-wrap gap-1.5">
              {item.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
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
      id="extensions"
      kind="extensions"
      query={catalog}
      view={view}
      icon={Blocks}
      repo="KubekPanel/extensions"
      sample={SAMPLE}
      marks={marks}
      searchText={(item) => item.keywords.join(" ")}
      details={details}
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
