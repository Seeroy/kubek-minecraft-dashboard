"use client";
import type { Server } from "@/modules/server";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { Table, TableBody, TableCell, TableRow } from "@/shared/ui/table";
import { AccessArea } from "@shared/access/areas";
import { FileCog, FileText, Pencil } from "lucide-react";
import { configFileName, useConfigFileEditor } from "../hooks/useConfigFileEditor";

export function ConfigFilesTab({ server }: { server: Server }) {
  const { t } = useTranslation("modules.serverSettings.configFiles");
  const blueprint = useBlueprint(server.blueprintId);
  const canWrite = useAccess([AccessArea.FILES, "write"], server.id);
  const { edit, busy } = useConfigFileEditor(server.id);
  const files = blueprint?.configFiles ?? [];

  return (
    <SettingsGroup
      tone="blue"
      icon={FileCog}
      title={t("title")}
      description={t("description")}
      note={canWrite ? undefined : t("noWriteAccess")}
      flush
    >
      <Table>
        <TableBody>
          {files.map((file) => {
            const step = busy?.path === file.path ? busy.step : null;
            // The structured tabs cover server.properties too
            const structured = file.parser === "properties" && file.path === "server.properties";
            return (
              <TableRow key={file.path} className="h-14">
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{file.label ?? configFileName(file.path)}</div>
                      <div className="truncate font-mono text-xs text-muted-foreground">{file.path}</div>
                      {structured && <div className="text-xs text-muted-foreground">{t("propertiesNote")}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-24">
                  <Badge variant="secondary">{t(`formats.${file.parser}`)}</Badge>
                </TableCell>
                <TableCell className="w-36 text-right">
                  <Button variant="outline" size="sm" disabled={!canWrite || !!busy} onClick={() => void edit(file)}>
                    {step ? <Spinner /> : <Pencil />}
                    {step ? t(step) : t("edit")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </SettingsGroup>
  );
}
