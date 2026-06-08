"use client";

import { useLanguageContext } from "@/shared/context/language-context";
import type { InstalledExtension } from "@/shared/types/extensions.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import type { Capability } from "@kubekpanel/extension-sdk";
import { Blocks, Power, PowerOff, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  installed: "secondary",
  disabled: "outline",
  error: "destructive",
};

const isImageSrc = (value?: string) =>
  !!value &&
  (value.startsWith("data:") ||
    value.startsWith("http") ||
    value.startsWith("/"));

export interface ExtensionCardProps {
  ext: InstalledExtension;
  busy: boolean;
  onConsent: (capabilities: Capability[]) => void;
  onEnable: () => void;
  onDisable: () => void;
  onRemove: () => void;
}

export const ExtensionCard = ({
  ext,
  busy,
  onConsent,
  onEnable,
  onDisable,
  onRemove,
}: ExtensionCardProps) => {
  const { t } = useLanguageContext();
  const requested = ext.manifest.permissions?.requires ?? [];
  const [selected, setSelected] = useState<Capability[]>(
    requested.length ? requested : ext.grantedCapabilities
  );
  const consentComplete = requested.every((c) =>
    ext.grantedCapabilities.includes(c)
  );

  const toggle = (cap: Capability) =>
    setSelected((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground">
            {isImageSrc(ext.icon) ? (
              <img
                src={ext.icon}
                alt={ext.manifest.name}
                className="size-5 object-contain"
              />
            ) : ext.icon ? (
              <span className="text-base leading-none">{ext.icon}</span>
            ) : (
              <Blocks className="size-4" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="leading-none font-medium">
                {ext.manifest.name}
              </span>
              <Badge variant={STATUS_VARIANT[ext.status] ?? "secondary"}>
                {t(`modules.extensions.status.${ext.status}`)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                v{ext.version}
              </span>
            </div>
            {ext.manifest.description && (
              <p className="text-xs text-muted-foreground">
                {ext.manifest.description}
              </p>
            )}
            {ext.error && (
              <p className="text-xs text-destructive">{ext.error}</p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={busy}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {requested.length > 0 && (
        <div className="rounded-md border border-border/60 bg-background/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            {t("modules.extensions.card.requestedAccess")}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {requested.map((cap) => (
              <label key={cap} className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={selected.includes(cap)}
                  onCheckedChange={() => toggle(cap)}
                  disabled={busy}
                />
                <span className="font-mono">{cap}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {requested.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => onConsent(selected)}
          >
            <ShieldCheck className="size-4" />
            {t("modules.extensions.card.saveConsent")}
          </Button>
        )}
        {ext.active ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onDisable}
          >
            <PowerOff className="size-4" />
            {t("modules.extensions.card.disable")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={busy || !consentComplete}
            onClick={onEnable}
          >
            <Power className="size-4" />
            {t("modules.extensions.card.enable")}
          </Button>
        )}
      </div>
    </div>
  );
};
