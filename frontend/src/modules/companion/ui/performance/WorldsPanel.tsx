"use client";

import type { CompanionWorld } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Panel, PanelHead, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Globe } from "lucide-react";

const ENVIRONMENTS = new Set(["NORMAL", "NETHER", "THE_END"]);
const count = (value: number | null) => (value == null ? "—" : value.toLocaleString());

export function WorldsPanel({ worlds }: { worlds: CompanionWorld[] }) {
  const { t } = useTranslation("modules.companion.performance.worlds");

  return (
    <Panel>
      <PanelHead>
        <Plate tone="green" size="sm">
          <Globe />
        </Plate>
        <PanelTitle>{t("title")}</PanelTitle>
      </PanelHead>
      {worlds.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("name")}</TableHead>
              <TableHead className="text-right">{t("players")}</TableHead>
              <TableHead className="text-right">{t("chunks")}</TableHead>
              <TableHead className="text-right">{t("entities")}</TableHead>
              <TableHead className="text-right max-sm:hidden">{t("tiles")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {worlds.map((world) => (
              <TableRow key={world.name}>
                <TableCell>
                  <b className="block truncate font-semibold">{world.name}</b>
                  <span className="text-xs text-muted-foreground">{t(`env.${ENVIRONMENTS.has(world.env) ? world.env : "OTHER"}`)}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{count(world.players)}</TableCell>
                <TableCell className="text-right tabular-nums">{count(world.chunks)}</TableCell>
                <TableCell className="text-right tabular-nums">{count(world.entities)}</TableCell>
                <TableCell className="text-right tabular-nums max-sm:hidden" title={world.tickingTiles != null ? t("ticking", world.tickingTiles) : undefined}>
                  {count(world.tiles)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
