"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import LogoMark from "@/shared/ui/logo-mark";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { TableCell, TableRow } from "@/shared/ui/table";
import type { InstalledPluginView } from "@shared/types/plugins";
import { Check, Download, ExternalLink, Trash2 } from "lucide-react";
import { useCompanionInstall } from "../../hooks/useCompanionInstall";

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" });

interface CompanionInstalledRowProps {
  item: InstalledPluginView;
  canUpdate: boolean;
  removeLabel: string;
  onRemove?: (item: InstalledPluginView) => void;
}

/** The plugin row for Kubek Companion, updated from GitHub releases */
export function CompanionInstalledRow({ item, canUpdate, removeLabel, onRemove }: CompanionInstalledRowProps) {
  const { t } = useTranslation("modules.companion.plugins");
  const { t: tc } = useTranslation("modules.content.installed");
  const { install, pending } = useCompanionInstall(item.serverId);
  const info = item.companion;
  const latest = item.hasUpdate ? info?.latestVersion : undefined;

  return (
    <TableRow className="h-[58px]">
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <Plate tone="primary">
            <LogoMark size={16} />
          </Plate>
          <div className="min-w-0">
            <b className="block truncate font-semibold">{t("name")}</b>
            <span className="block truncate text-xs text-muted-foreground">{t("description")}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="grid text-[12.5px] leading-snug">
          <span className="truncate font-mono">{info?.version ?? "—"}</span>
          {latest && (
            <span className="truncate font-mono text-[11.5px] text-warn" title={tc("newerVersion")}>
              → {latest}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden @xl/table:table-cell">
        <div className="flex flex-wrap gap-1">
          {latest ? (
            <Badge variant="warning">{tc("badges.update")}</Badge>
          ) : (
            <Badge variant="success">
              <Check />
              {tc("badges.upToDate")}
            </Badge>
          )}
          <Badge variant={info?.connected ? "info" : "secondary"}>{info?.connected ? t("connected") : t("notConnected")}</Badge>
        </div>
      </TableCell>
      <TableCell className="hidden @4xl/table:table-cell">
        <span className="block max-w-52 truncate font-mono text-[11.5px] text-muted-foreground" title={item.fileName}>
          {item.fileName}
        </span>
      </TableCell>
      <TableCell className="hidden text-[12.5px] text-muted-foreground @3xl/table:table-cell">{dateFormat.format(item.installedAt)}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-0.5">
          {latest && canUpdate && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-warn hover:text-warn"
              disabled={pending}
              title={tc("updateTo", latest)}
              aria-label={tc("updateTo", latest)}
              onClick={() => void install()}
            >
              {pending ? <Spinner /> : <Download />}
            </Button>
          )}
          {info && (
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              title={t("releases")}
              aria-label={t("releases")}
              render={<a href={info.releaseUrl} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink />
            </Button>
          )}
          {onRemove && (
            <Button variant="ghost" size="icon-sm" className="hover:bg-danger/10 hover:text-danger" title={removeLabel} aria-label={removeLabel} onClick={() => onRemove(item)}>
              <Trash2 />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
