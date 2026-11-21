"use client";
import type { CompanionPlayer, PlayersOverview } from "@/api";
import { CompanionPlayerDetail } from "@/modules/companion/ui/players/CompanionPlayerDetail";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel, PanelHead, PanelMeta } from "@/shared/ui/panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { PowerOff, Search, SearchX, UsersRound, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useOpenPlayer } from "../hooks/useOpenPlayer";
import type { PlayerActions } from "../hooks/usePlayerActions";
import type { PlayersAccess } from "../hooks/usePlayersAccess";
import { listsLookup, matchesQuery } from "../lib/players";
import { PlayerCell } from "./PlayerCell";
import { PlayerRowMenu } from "./PlayerRowMenu";
import { PlayerStatusBadges } from "./PlayerStatusBadges";

interface OnlineTabProps {
  serverId: string;
  blueprintId?: string;
  /** Names from the status query, null while the server is not running */
  online: string[] | null;
  overview: PlayersOverview | undefined;
  access: PlayersAccess;
  actions: PlayerActions;
  /** Kubek Companion data by lowercase name, missing without the plugin */
  live?: Map<string, CompanionPlayer>;
}

function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <Empty className="py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {hint && <EmptyDescription>{hint}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  );
}

export function OnlineTab({ serverId, blueprintId, online, overview, access, actions, live }: OnlineTabProps) {
  const { t } = useTranslation("modules.players");
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim().toLowerCase(), 150);
  const openPlayer = useOpenPlayer(serverId, blueprintId);
  const lookup = useMemo(() => listsLookup(overview), [overview]);

  if (online === null) {
    return (
      <Panel>
        <EmptyState icon={PowerOff} title={t("online.stopped")} hint={t("online.stoppedHint")} />
      </Panel>
    );
  }

  const rows = online.filter((name) => matchesQuery(search, name));

  return (
    <Panel className="overflow-hidden">
      <PanelHead className="flex-wrap gap-2 py-2">
        <PanelMeta>{t("count", online.length)}</PanelMeta>
        {online.length > 0 && (
          <InputGroup className="w-full sm:ml-auto sm:max-w-72">
            <InputGroupAddon>
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} aria-label={t("search")} />
          </InputGroup>
        )}
      </PanelHead>
      {online.length === 0 ? (
        <EmptyState icon={UsersRound} title={t("online.empty")} />
      ) : rows.length === 0 ? (
        <EmptyState icon={SearchX} title={t("noMatches")} />
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("table.player")}</TableHead>
              {live && <TableHead className="hidden w-[38%] @2xl/table:table-cell">{t("table.session")}</TableHead>}
              <TableHead className="hidden w-48 @xl/table:table-cell">{t("table.status")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((name) => {
              const key = name.toLowerCase();
              const op = lookup.ops.get(key);
              const companion = live?.get(key);
              const uuid = companion?.uuid ?? op?.uuid ?? lookup.whitelist.get(key)?.uuid ?? null;
              const player = {
                name,
                uuid,
                online: true,
                isOp: !!op,
                isWhitelisted: lookup.whitelist.has(key),
                isBanned: lookup.bans.has(key),
              };
              // The status query only knows names, the dialog finds the uuid by name
              const open = () => openPlayer(uuid ?? name, name);
              return (
                <TableRow
                  key={name}
                  tabIndex={0}
                  className="h-[58px] cursor-pointer"
                  onClick={open}
                  onKeyDown={(event) => event.key === "Enter" && event.target === event.currentTarget && open()}
                >
                  <TableCell>
                    <PlayerCell name={name} sub={uuid} />
                  </TableCell>
                  {live && (
                    <TableCell className="hidden text-[12.5px] text-muted-foreground @2xl/table:table-cell">
                      {companion && <CompanionPlayerDetail player={companion} />}
                    </TableCell>
                  )}
                  <TableCell className="hidden @xl/table:table-cell">
                    <PlayerStatusBadges player={{ ...player, online: false }} opLevel={op?.level} whitelistOn={!!overview?.settings.whitelist} />
                  </TableCell>
                  <TableCell>
                    <PlayerRowMenu serverId={serverId} player={player} listsReady={!!overview} access={access} actions={actions} onOpen={open} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
