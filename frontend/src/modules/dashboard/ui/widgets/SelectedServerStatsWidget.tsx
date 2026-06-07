"use client";
import { ServerStatusIndicator, useServerStore } from "@/modules/server";
import { useServerStatus } from "@/modules/server/store/server-statuses.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import BlobImage from "@/shared/ui/BlobImage";
import { Badge } from "@/shared/ui/badge";
import { ServerStatus } from "@shared/types/server/server.types";
import type { LucideIcon } from "lucide-react";
import { Box, Clock, Tag, UsersRound } from "lucide-react";
import React from "react";

function formatUptime(startedAt?: string): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return "-";
  const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${ d }d ${ h }h`;
  if (h > 0) return `${ h }h ${ m }m`;
  return `${ m }m`;
}

const STATUS_RING: Record<string, string> = {
  [ServerStatus.RUNNING]: "ring-emerald-400/40 dark:ring-emerald-300/40",
  [ServerStatus.STOPPED]: "ring-rose-400/40 dark:ring-rose-300/40",
  [ServerStatus.STARTING]: "ring-amber-400/40 dark:ring-amber-300/40",
  [ServerStatus.STOPPING]: "ring-orange-400/40 dark:ring-orange-300/40",
};

interface StatRowProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  accent?: string;
}

function StatRow({ icon: Icon, label, value, accent }: StatRowProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card/40 px-2.5 py-2">
      <div className={ cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
        accent,
      ) }>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{ label }</dt>
        <dd className="truncate text-sm font-semibold">{ value }</dd>
      </div>
    </div>
  );
}

export default function SelectedServerStatsWidget() {
  const { t } = useTranslation("modules.dashboard");
  const { selectedServer } = useServerStore();
  const status = useServerStatus(selectedServer?.id);
  const blueprint = useBlueprint(selectedServer?.blueprintId);

  if (!selectedServer) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">{ t("noServer") }</p>
      </div>
    );
  }

  const players = status?.players;
  const serverStatus = ((status?.status ?? selectedServer.status) as ServerStatus) || ServerStatus.STOPPED;
  const gameVersion = selectedServer.variables?.GAME_VERSION;
  const versionRaw = status?.version || (gameVersion != null ? String(gameVersion) : "") || "-";
  const coreType = blueprint?.shortName ?? blueprint?.name;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={ cn(
          "relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border p-2",
        ) }>
          <BlobImage
            src={ `servers/${ selectedServer.id }/icon` }
            alt={ selectedServer.name }
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-base font-semibold leading-tight">
            { selectedServer.name }
          </span>
          <div className="flex items-center gap-1.5">
            <ServerStatusIndicator status={ serverStatus } variant="dot" size="sm" showLabel />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <StatRow
          icon={ UsersRound }
          label={ t("stats.players") }
          value={ players ? `${ players.online } / ${ players.max }` : "-" }
          accent="bg-emerald-500/10 text-emerald-500"
        />
        <StatRow
          icon={ Clock }
          label={ t("stats.uptime") }
          value={ formatUptime(status?.runtime?.startedAt) }
          accent="bg-blue-500/10 text-blue-500"
        />
        <StatRow
          icon={ Tag }
          label={ t("stats.version") }
          value={ versionRaw }
          accent="bg-purple-500/10 text-purple-500"
        />
        <StatRow
          icon={ Box }
          label={ t("stats.core") }
          value={ coreType ? <Badge variant="info" className="h-[18px] px-1.5 text-[10px]">{ coreType }</Badge> : "-" }
          accent="bg-amber-500/10 text-amber-500"
        />
      </dl>
    </div>
  );
}
