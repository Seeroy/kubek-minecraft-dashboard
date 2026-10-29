"use client";
import type { PlayersOverview } from "@/api";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Crown, Trash2 } from "lucide-react";
import { useState } from "react";
import type { PlayerActions } from "../hooks/usePlayerActions";
import type { PlayersAccess } from "../hooks/usePlayersAccess";
import { matchesQuery } from "../lib/players";
import { AddPlayerForm } from "./AddPlayerForm";
import { PlayerRow } from "./PlayerRow";
import { PlayersPanel } from "./PlayersPanel";

interface OpsTabProps {
  serverId: string;
  overview: PlayersOverview;
  busy: boolean;
  access: PlayersAccess;
  actions: PlayerActions;
}

export function OpsTab({ serverId, overview, busy, access, actions }: OpsTabProps) {
  const { t } = useTranslation("modules.players");
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim().toLowerCase(), 150);
  const { ops } = overview;
  const locked = !access.canManage || busy || actions.pending;
  const rows = ops.filter((op) => matchesQuery(search, op.name, op.uuid));

  return (
    <PlayersPanel
      total={ops.length}
      shown={rows.length}
      query={query}
      onQuery={setQuery}
      empty={{ icon: Crown, title: t("ops.empty"), hint: t("ops.emptyHint") }}
      form={
        access.canManage && (
          <AddPlayerForm
            serverId={serverId}
            submitLabel={t("ops.add")}
            submitIcon={Crown}
            disabled={busy}
            onSubmit={(player) => actions.addOp({ name: player.name })}
          />
        )
      }
    >
      {rows.map((op) => (
        <PlayerRow
          key={op.uuid || op.name}
          name={op.name}
          uuid={op.uuid}
          badges={
            <>
              <Badge variant="warning" title={t(`ops.levels.${op.level}`)}>
                <Crown />
                {t("online.op", op.level)}
              </Badge>
              {op.bypassesPlayerLimit && <Badge variant="secondary">{t("ops.bypassBadge")}</Badge>}
            </>
          }
          actions={
            access.canManage && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-danger/10 hover:text-danger"
                disabled={locked}
                title={t("actions.deop")}
                aria-label={t("actions.deop")}
                onClick={() => void actions.removeOp(op.name)}
              >
                <Trash2 />
              </Button>
            )
          }
        />
      ))}
    </PlayersPanel>
  );
}
