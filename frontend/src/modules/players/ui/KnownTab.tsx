"use client";
import type { PlayersOverview } from "@/api";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { LoadError } from "@/shared/ui/load-error";
import { Pagination } from "@/shared/ui/pagination";
import { Panel, PanelHead, PanelMeta } from "@/shared/ui/panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Search, SearchX, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useKnownPlayers } from "../api/players.queries";
import { SAMPLE_KNOWN_PAGE } from "../data/samples";
import { useOpenPlayer } from "../hooks/useOpenPlayer";
import type { PlayerActions } from "../hooks/usePlayerActions";
import type { PlayersAccess } from "../hooks/usePlayersAccess";
import { listsLookup } from "../lib/players";
import { PlayerCell } from "./PlayerCell";
import { PlayerRowMenu } from "./PlayerRowMenu";
import { PlayerStatusBadges } from "./PlayerStatusBadges";

const PAGE_SIZE = 25;

interface KnownTabProps {
  serverId: string;
  blueprintId?: string;
  /** Names from the status query, null while the server is not running */
  online: string[] | null;
  overview: PlayersOverview | undefined;
  access: PlayersAccess;
  actions: PlayerActions;
}

export function KnownTab({ serverId, blueprintId, online, overview, access, actions }: KnownTabProps) {
  const { t } = useTranslation("modules.players");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 250);
  const result = useKnownPlayers(serverId, { page, pageSize: PAGE_SIZE, search }, access.supported && access.canView);
  const openPlayer = useOpenPlayer(serverId, blueprintId);
  const lookup = useMemo(() => listsLookup(overview), [overview]);
  const onlineSet = useMemo(() => new Set(online?.map((name) => name.toLowerCase())), [online]);

  const onQuery = (next: string) => {
    setQuery(next);
    setPage(0);
  };

  return (
    <Panel className="overflow-hidden">
      <PanelHead className="flex-wrap gap-2 py-2">
        <PanelMeta>{t("count", result.data?.total ?? 0)}</PanelMeta>
        <InputGroup className="w-full sm:ml-auto sm:max-w-72">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t("search")} aria-label={t("search")} />
        </InputGroup>
      </PanelHead>

      <DataReveal
        id="players-known"
        data={result.data}
        sample={SAMPLE_KNOWN_PAGE}
        error={result.isError && !result.data ? <LoadError onRetry={() => void result.refetch()} className="rounded-none border-0" /> : undefined}
      >
        {({ items, total }) =>
          items.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">{search ? <SearchX /> : <UsersRound />}</EmptyMedia>
                <EmptyTitle>{search ? t("noMatches") : t("known.empty")}</EmptyTitle>
                {!search && <EmptyDescription>{t("known.emptyHint")}</EmptyDescription>}
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("table.player")}</TableHead>
                    <TableHead className="hidden w-56 @xl/table:table-cell">{t("table.status")}</TableHead>
                    <TableHead className="w-36 max-sm:w-28">{t("table.saved")}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((known) => {
                    const key = known.name?.toLowerCase() ?? "";
                    const op = lookup.ops.get(key);
                    const player = {
                      name: known.name,
                      uuid: known.uuid,
                      online: !!key && onlineSet.has(key),
                      isOp: !!op,
                      isWhitelisted: lookup.whitelist.has(key),
                      isBanned: lookup.bans.has(key),
                    };
                    const open = () => openPlayer(known.uuid, known.name);
                    return (
                      <TableRow
                        key={known.uuid}
                        tabIndex={0}
                        className="h-[58px] cursor-pointer"
                        onClick={open}
                        onKeyDown={(event) => event.key === "Enter" && event.target === event.currentTarget && open()}
                      >
                        <TableCell>
                          <PlayerCell name={known.name} sub={known.uuid} />
                        </TableCell>
                        <TableCell className="hidden @xl/table:table-cell">
                          <PlayerStatusBadges player={player} opLevel={op?.level} whitelistOn={!!overview?.settings.whitelist} />
                        </TableCell>
                        <TableCell className="text-[12.5px] text-muted-foreground">
                          {known.savedAt ? formatRelative(known.savedAt, t("known.justNow")) : t("known.noSave")}
                        </TableCell>
                        <TableCell>
                          <PlayerRowMenu serverId={serverId} player={player} listsReady={!!overview} access={access} actions={actions} onOpen={open} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />}
            </>
          )
        }
      </DataReveal>
    </Panel>
  );
}
