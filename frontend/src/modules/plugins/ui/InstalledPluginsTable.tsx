import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { InstalledPluginView } from "@shared/types/plugins";
import { InstalledPluginsTableRow } from "./InstalledPluginsTableRow";

interface InstalledPluginsTableProps {
  installed: InstalledPluginView[];
  installedDependencies: Set<string>;
  onUpdate: (plugin: InstalledPluginView) => void;
  onRemove: (plugin: InstalledPluginView) => void;
}

export const InstalledPluginsTable = ({
  installed,
  installedDependencies,
  onUpdate,
  onRemove,
}: InstalledPluginsTableProps) => {
  const { t } = useTranslation("modules.plugins.installedTab");
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="max-h-[72vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-card">
              <TableHead className="pl-13 text-foreground/70">
                {t("table.headers.name")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.version")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.status")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.file")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.installed")}
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installed.map((plugin) => (
              <InstalledPluginsTableRow
                key={plugin.id}
                plugin={plugin}
                isDependency={installedDependencies.has(plugin.id)}
                onUpdate={() => onUpdate(plugin)}
                onRemove={() => onRemove(plugin)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
