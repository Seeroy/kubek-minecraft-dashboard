"use client";

import type { CompanionLagReport } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Button } from "@/shared/ui/button";
import { Panel, PanelActions, PanelBody, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { ScanSearch, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useLagReportMutation } from "../../api/companion.queries";
import type { CompanionState } from "../../hooks/useCompanion";
import { CompanionLock } from "../CompanionLock";

type LagWorld = CompanionLagReport["worlds"][number];
type LagChunk = LagWorld["topEntityChunks"][number];

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-2">
      <h4 className="label-caps">{title}</h4>
      {children}
    </section>
  );
}

function Counts({ rows }: { rows: { label: ReactNode; count: number; hint?: string }[] }) {
  const { t } = useTranslation("modules.companion.performance.lag");
  if (rows.length === 0) return <p className="text-[12.5px] text-muted-foreground">{t("nothing")}</p>;
  return (
    <ul className="grid gap-1 text-[13px]">
      {rows.map((row, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate" title={row.hint}>
            {row.label}
          </span>
          <b className="font-semibold tabular-nums">{row.count.toLocaleString()}</b>
        </li>
      ))}
    </ul>
  );
}

// Chunk coords plus block coords, the second is what /tp needs
const chunkLabel = (chunk: LagChunk) => `${chunk.x}, ${chunk.z}`;
const chunkHint = (chunk: LagChunk) =>
  `x ${chunk.x * 16}..${chunk.x * 16 + 15}, z ${chunk.z * 16}..${chunk.z * 16 + 15}: ${chunk.types.map((t) => `${t.type} ${t.count}`).join(", ")}`;

function WorldReport({ world }: { world: LagWorld }) {
  const { t } = useTranslation("modules.companion.performance.lag");
  return (
    <div className="grid gap-4 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
        <b className="font-semibold">{world.name}</b>
        <span className="text-muted-foreground">{t("worldSummary", world.entities, world.chunks)}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Section title={t("entityTypes")}>
          <Counts rows={world.entityTypes.map((e) => ({ label: e.type, count: e.count }))} />
        </Section>
        <Section title={t("entityChunks")}>
          <Counts rows={world.topEntityChunks.map((c) => ({ label: chunkLabel(c), count: c.count, hint: chunkHint(c) }))} />
        </Section>
        <Section title={t("tileChunks")}>
          {world.topTileChunks ? (
            <Counts rows={world.topTileChunks.map((c) => ({ label: chunkLabel(c), count: c.count, hint: chunkHint(c) }))} />
          ) : (
            <p className="text-[12.5px] text-muted-foreground">{t("tilesPaperOnly")}</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Report({ report }: { report: CompanionLagReport }) {
  const { t } = useTranslation("modules.companion.performance.lag");
  return (
    <div className="grid gap-4">
      {report.partial && <p className="text-[12.5px] text-muted-foreground">{t("foliaPartial")}</p>}
      {report.worlds.map((world) => (
        <WorldReport key={world.name} world={world} />
      ))}
      {report.tasks && (
        <Section title={t("tasks")}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("taskPlugin")}</TableHead>
                <TableHead className="text-right">{t("taskSync")}</TableHead>
                <TableHead className="text-right">{t("taskAsync")}</TableHead>
                <TableHead className="text-right">{t("taskRunning")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.tasks.map((task) => (
                <TableRow key={task.plugin}>
                  <TableCell className="font-medium">{task.plugin}</TableCell>
                  <TableCell className="text-right tabular-nums">{task.sync}</TableCell>
                  <TableCell className="text-right tabular-nums">{task.async}</TableCell>
                  <TableCell className="text-right tabular-nums">{task.running}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
    </div>
  );
}

export function LagReportPanel({ serverId, state }: { serverId: string; state: CompanionState }) {
  const { t } = useTranslation("modules.companion.performance.lag");
  const report = useLagReportMutation(serverId);
  const locked = state !== "connected";

  return (
    <Panel>
      <PanelHead className="flex-wrap">
        <Plate tone="purple" size="sm">
          <ScanSearch />
        </Plate>
        <PanelTitle>{t("title")}</PanelTitle>
        <PanelMeta className="truncate max-sm:hidden">
          {report.data ? t("takenAt", timeFormat.format(report.data.ts)) : t("description")}
        </PanelMeta>
        <PanelActions>
          <CompanionLock state={state} locked={locked}>
            <Button size="sm" variant="outline" disabled={locked || report.isPending} onClick={() => report.mutate(undefined)}>
              {report.isPending ? <Spinner /> : <ScanSearch />}
              {report.isPending ? t("running") : report.data ? t("again") : t("run")}
            </Button>
          </CompanionLock>
        </PanelActions>
      </PanelHead>
      <PanelBody>
        {report.isError ? (
          <p className="flex items-center gap-2 text-[13px] text-danger">
            <TriangleAlert className="size-4" />
            {getApiErrorMessage(report.error)}
          </p>
        ) : report.data ? (
          <Report report={report.data} />
        ) : (
          <p className="py-6 text-center text-[13px] text-muted-foreground">{t("empty")}</p>
        )}
      </PanelBody>
    </Panel>
  );
}
