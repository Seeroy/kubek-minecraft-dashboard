"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { InstalledExtension } from "@/shared/types/extensions.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Plate } from "@/shared/ui/plate";
import { Switch } from "@/shared/ui/switch";
import type { Capability } from "@kubekpanel/extension-sdk";
import { AlertTriangle, Blocks, Check, ChevronDown, LayoutDashboard, Menu, PanelsTopLeft, Settings, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

// Capabilities that reach outside the panel or act on servers deserve a second look
const RISKY = new Set<Capability>(["servers:control", "http:outbound", "events:auth", "http:routes"]);

const STATUS_BADGE = {
  active: "success",
  installed: "info",
  disabled: "secondary",
  error: "destructive",
} as const;

const isImageSrc = (value?: string) => !!value && /^(data:|https?:|\/)/.test(value);

export const needsConsent = (ext: InstalledExtension) =>
  (ext.manifest.permissions?.requires ?? []).some((cap) => !ext.grantedCapabilities.includes(cap));

interface ExtensionRowProps {
  ext: InstalledExtension;
  open: boolean;
  busy: boolean;
  canManage: boolean;
  onToggleOpen: () => void;
  onConsent: (capabilities: Capability[]) => void;
  onEnabledChange: (enabled: boolean) => void;
  onRemove: () => void;
}

function Contribution({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <Plate tone="gray" size="sm">
        {icon}
      </Plate>
      {children}
    </div>
  );
}

export function ExtensionRow({ ext, open, busy, canManage, onToggleOpen, onConsent, onEnabledChange, onRemove }: ExtensionRowProps) {
  const { t } = useTranslation("modules.extensions");
  const requested = ext.manifest.permissions?.requires ?? [];
  // Nothing granted yet means a fresh install, so everything requested starts ticked
  const [selected, setSelected] = useState<Capability[]>(() =>
    ext.grantedCapabilities.length ? requested.filter((cap) => ext.grantedCapabilities.includes(cap)) : requested
  );
  const consent = needsConsent(ext);
  const contributes = ext.manifest.frontend?.contributes;
  const author = ext.manifest.author?.name;
  const toggleCap = (cap: Capability, on: boolean) => setSelected((prev) => (on ? [...prev, cap] : prev.filter((item) => item !== cap)));

  return (
    <div className={cn("not-first:border-t not-first:border-border", ext.status === "disabled" && "[&_[data-slot=ext-icon]]:opacity-60 [&_[data-slot=ext-icon]]:grayscale")}>
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <Plate data-slot="ext-icon" tone="purple" size="lg" className="size-10">
          {isImageSrc(ext.icon) ? (
            // Icons come inline as data URIs from the package
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ext.icon} alt="" className="size-6 object-contain" />
          ) : ext.icon ? (
            <span className="text-lg leading-none">{ext.icon}</span>
          ) : (
            <Blocks />
          )}
        </Plate>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[14px] font-semibold">{ext.manifest.name}</b>
            <Badge variant={STATUS_BADGE[ext.status]}>{t(`status.${ext.status}`)}</Badge>
            {consent && <Badge variant="warning">{t("needsConsent")}</Badge>}
            <span className="font-mono text-[11.5px] text-muted-foreground">v{ext.version}</span>
            {author && <span className="text-xs text-muted-foreground">· {author}</span>}
          </div>
          {ext.manifest.description && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{ext.manifest.description}</p>}
          {ext.error && (
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-danger">
              <AlertTriangle className="size-3.5 shrink-0" />
              {ext.error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {canManage && (
            <Switch
              checked={ext.active}
              disabled={busy || (!ext.active && (consent || ext.status === "error"))}
              onCheckedChange={onEnabledChange}
              aria-label={t("toggle", ext.manifest.name)}
            />
          )}
          <Button variant="ghost" size="icon-sm" aria-expanded={open} aria-label={t("details")} title={t("details")} onClick={onToggleOpen}>
            <ChevronDown className={cn("transition-transform duration-200", open && "rotate-180")} />
          </Button>
          {canManage && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-danger/10 hover:text-danger"
              disabled={busy}
              aria-label={t("remove")}
              title={t("remove")}
              onClick={onRemove}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {open && (
        <div className="grid gap-5 px-4 pb-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:pl-[68px]">
          <section>
            <h4 className="label-caps mb-2">{t("access.title")}</h4>
            {requested.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">{t("access.none")}</p>
            ) : (
              <>
                {requested.map((cap) => (
                  <label key={cap} className="grid cursor-pointer grid-cols-[16px_minmax(0,1fr)] items-start gap-2.5 py-1.5 text-[13px]">
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.includes(cap)}
                      disabled={busy || !canManage}
                      onCheckedChange={(checked) => toggleCap(cap, checked)}
                    />
                    <span>
                      <span className="flex items-center gap-1.5 font-medium">
                        {t(`capabilities.${cap}.label`)}
                        {RISKY.has(cap) && <Badge variant="warning">{t("access.risky")}</Badge>}
                      </span>
                      <small className="block font-mono text-[11.5px] text-muted-foreground">
                        {cap} · {t(`capabilities.${cap}.hint`)}
                      </small>
                    </span>
                  </label>
                ))}
                {canManage && (
                  <Button size="sm" variant={consent ? "default" : "outline"} className="mt-2" disabled={busy} onClick={() => onConsent(selected)}>
                    <Check />
                    {t("access.save")}
                  </Button>
                )}
              </>
            )}
          </section>
          <section>
            <h4 className="label-caps mb-2">{t("adds.title")}</h4>
            <div className="grid gap-1.5">
              {contributes?.sidebar?.map((item) => (
                <Contribution key={item.id} icon={<Menu />}>
                  {t("adds.sidebar", item.route)}
                </Contribution>
              ))}
              {contributes?.serverTabs?.map((item) => (
                <Contribution key={item.id} icon={<PanelsTopLeft />}>
                  {t("adds.serverTab", item.id)}
                </Contribution>
              ))}
              {contributes?.dashboardWidgets?.map((item) => (
                <Contribution key={item.id} icon={<LayoutDashboard />}>
                  {t("adds.widget", item.id)}
                </Contribution>
              ))}
              {contributes?.settingsPanels?.map((item) => (
                <Contribution key={item.id} icon={<Settings />}>
                  {t("adds.settings", item.id)}
                </Contribution>
              ))}
              {contributes?.slots?.map((item) => (
                <Contribution key={`${item.slot}:${item.component}`} icon={<Blocks />}>
                  {t("adds.slot")} <code className="font-mono text-[11.5px] text-muted-foreground">{item.slot}</code>
                </Contribution>
              ))}
              {!contributes || Object.values(contributes).every((list) => !list?.length) ? (
                <p className="text-[12.5px] text-muted-foreground">{t("adds.nothing")}</p>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
