import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { TableCell, TableRow } from "@/shared/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { InstalledPluginView } from "@shared/types/plugins";
import {
  AlertCircle,
  ArrowUpCircle,
  Link2,
  Package,
  Sparkles,
  Trash2,
} from "lucide-react";

interface InstalledPluginsTableRowProps {
  plugin: InstalledPluginView;
  isDependency: boolean;
  onUpdate: () => void;
  onRemove: () => void;
}

export const InstalledPluginsTableRow = ({
  plugin,
  isDependency,
  onUpdate,
  onRemove,
}: InstalledPluginsTableRowProps) => {
  const { t } = useTranslation("modules.plugins.installedCard");
  const hasUpdate = plugin.hasUpdate;
  const isManual = plugin.type === "manual";
  const displayName = isManual
    ? plugin.fileName.replace(/\.jar$/, "")
    : plugin.metadata!.title;
  const fileName = isManual
    ? plugin.fileName
    : (plugin.version!.files[0]?.filename ?? plugin.fileName);
  const iconUrl = isManual ? undefined : plugin.metadata!.iconUrl;

  return (
    <TableRow
      className={cn(
        "bg-card/20 transition-colors hover:bg-card/60",
        isDependency && "bg-blue-500/5"
      )}
    >
      <TableCell>
        <div className="flex items-center gap-3 pl-3">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              loading="lazy"
              className="h-8 w-8 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="rounded-lg bg-primary/10 p-2">
              <Package className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="min-w-0 font-medium">{displayName}</div>
        </div>
      </TableCell>

      <TableCell>
        {isManual ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              v{plugin.version!.versionNumber}
            </Badge>
            {hasUpdate && (
              <Tooltip>
                <TooltipTrigger
                  render={<AlertCircle className="h-4 w-4 text-amber-500" />}
                />
                <TooltipContent>{t("tooltips.updateAvailable")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </TableCell>

      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          {hasUpdate && !isManual && (
            <Badge
              variant="default"
              className="bg-amber-500 text-white shadow-sm"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              {t("badges.update")}
            </Badge>
          )}
          {isManual && (
            <Badge
              variant="secondary"
              className="border-gray-500/30 bg-gray-500/20 text-gray-600"
            >
              <Package className="mr-1 h-3 w-3" />
              {t("badges.manual")}
            </Badge>
          )}
          {isDependency && (
            <Badge
              variant="secondary"
              className="border-blue-500/30 bg-blue-500/20 text-blue-600"
            >
              <Link2 className="mr-1 h-3 w-3" />
              {t("badges.dependency")}
            </Badge>
          )}
        </div>
      </TableCell>

      <TableCell className="max-w-[220px]">
        <span
          className="block truncate text-sm text-muted-foreground"
          title={fileName}
        >
          {fileName}
        </span>
      </TableCell>

      <TableCell>
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex flex-col">
                <span className="text-sm">
                  {new Date(plugin.installedAt).toLocaleDateString()}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  {new Date(plugin.installedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            }
          />
          <TooltipContent>
            {t(
              "labels.installedAt",
              new Date(plugin.installedAt).toLocaleString()
            )}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      <TableCell className="pr-6">
        <div className="flex justify-end gap-1.5">
          {!isManual && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="sm"
                    variant={hasUpdate ? "default" : "outline"}
                    className={cn(
                      "h-8 px-2 text-xs",
                      hasUpdate && "bg-amber-500 hover:bg-amber-600"
                    )}
                    onClick={onUpdate}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <TooltipContent>
                {hasUpdate
                  ? t("tooltips.updateButton")
                  : t("tooltips.reinstallButton")}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 px-2 text-xs"
                  onClick={onRemove}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <TooltipContent>{t("tooltips.removeButton")}</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
};
