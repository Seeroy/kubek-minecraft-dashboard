"use client";
import type { PlayersOverview } from "@/api";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Panel } from "@/shared/ui/panel";
import { Crown, PowerOff, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { PlayerActions } from "../hooks/usePlayerActions";
import type { PlayersAccess } from "../hooks/usePlayersAccess";
import { matchesQuery } from "../lib/players";
import { PlayerMenu } from "./PlayerMenu";
import { PlayerRow } from "./PlayerRow";
import { PlayersPanel } from "./PlayersPanel";

interface OnlineTabProps {
  /** Names from the status query, null while the server is not running */
  online: string[] | null;
  overview: PlayersOverview | undefined;
  access: PlayersAccess;
  actions: PlayerActions;
}

export function OnlineTab({ online, overview, access, actions }: OnlineTabProps) {
  const { t } = useTranslation("modules.players");
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim().toLowerCase(), 150);

  const lookup = useMemo(() => {
    const lower = (name: string) => name.toLowerCase();
    return {
      ops: new Map(overview?.ops.map((op) => [lower(op.name), op]) ?? []),
      whitelist: new Map(overview?.whitelist.map((entry) => [lower(entry.name), entry]) ?? []),
    };
  }, [overview]);

  if (online === null) {
    return (
      <Panel>
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PowerOff />
            </EmptyMedia>
            <EmptyTitle>{t("online.stopped")}</EmptyTitle>
            <EmptyDescription>{t("online.stoppedHint")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Panel>
    );
  }

  const rows = online.filter((name) => matchesQuery(search, name));

  return (
    <PlayersPanel total={online.length} shown={rows.length} query={query} onQuery={setQuery} empty={{ icon: UsersRound, title: t("online.empty") }}>
      {rows.map((name) => {
        const key = name.toLowerCase();
        const op = lookup.ops.get(key);
        const listed = lookup.whitelist.get(key);
        return (
          <PlayerRow
            key={name}
            name={name}
            uuid={op?.uuid ?? listed?.uuid}
            badges={
              <>
                {op && (
                  <Badge variant="warning">
                    <Crown />
                    {t("online.op", op.level)}
                  </Badge>
                )}
                {listed && overview?.settings.whitelist && <Badge variant="secondary">{t("online.whitelisted")}</Badge>}
              </>
            }
            actions={<PlayerMenu name={name} isOp={!!op} listsReady={!!overview} access={access} actions={actions} />}
          />
        );
      })}
    </PlayersPanel>
  );
}
