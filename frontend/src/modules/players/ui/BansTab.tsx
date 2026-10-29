"use client";
import type { PlayersOverview } from "@/api";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Plate } from "@/shared/ui/plate";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { Ban, Globe, ShieldOff, Undo2 } from "lucide-react";
import { useState } from "react";
import type { PlayerActions } from "../hooks/usePlayerActions";
import type { PlayersAccess } from "../hooks/usePlayersAccess";
import { matchesQuery } from "../lib/players";
import { AddPlayerForm } from "./AddPlayerForm";
import { BanDetail, BanExpiry, BanFields } from "./BanFields";
import { IpBanForm } from "./IpBanForm";
import { PlayerRow } from "./PlayerRow";
import { PlayersPanel } from "./PlayersPanel";

type BanKind = "players" | "ips";

interface BansTabProps {
  serverId: string;
  overview: PlayersOverview;
  busy: boolean;
  access: PlayersAccess;
  actions: PlayerActions;
}

export function BansTab({ serverId, overview, busy, access, actions }: BansTabProps) {
  const { t } = useTranslation("modules.players");
  const [kind, setKind] = useState<BanKind>("players");
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const search = useDebouncedValue(query.trim().toLowerCase(), 150);
  const { bans, ipBans } = overview;
  const locked = !access.canManage || busy || actions.pending;

  // The end date is taken when the ban is sent, not when the form rendered
  const ban = () => ({ reason: reason.trim() || undefined });
  const afterBan = (ok: boolean) => {
    if (ok) setReason("");
    return ok;
  };

  const fields = <BanFields reason={reason} onReason={setReason} disabled={busy} />;

  const pardonButton = (onClick: () => void) =>
    access.canManage && (
      <Button variant="ghost" size="sm" disabled={locked} onClick={onClick}>
        <Undo2 />
        <span className="max-sm:sr-only">{t("actions.pardon")}</span>
      </Button>
    );

  const head = (
    <ToggleGroup variant="segmented" value={[kind]} onValueChange={(next) => next[0] && setKind(next[0] as BanKind)}>
      <Toggle variant="segmented" value="players">
        {t("bans.players")}
      </Toggle>
      <Toggle variant="segmented" value="ips">
        {t("bans.ips")}
      </Toggle>
    </ToggleGroup>
  );

  if (kind === "ips") {
    const rows = ipBans.filter((entry) => matchesQuery(search, entry.ip, entry.reason));
    return (
      <PlayersPanel
        total={ipBans.length}
        shown={rows.length}
        query={query}
        onQuery={setQuery}
        head={head}
        empty={{ icon: ShieldOff, title: t("bans.ipEmpty") }}
        form={
          access.canManage && (
            <IpBanForm disabled={busy} extra={fields} onSubmit={async (ip) => afterBan(await actions.banIp({ ip, ...ban() }))} />
          )
        }
      >
        {rows.map((entry) => (
          <PlayerRow
            key={entry.ip}
            name={entry.ip}
            head={
              <Plate tone="red" size="lg">
                <Globe />
              </Plate>
            }
            badges={<BanExpiry ban={entry} />}
            detail={<BanDetail ban={entry} />}
            actions={pardonButton(() => void actions.pardonIp(entry.ip))}
          />
        ))}
      </PlayersPanel>
    );
  }

  const rows = bans.filter((entry) => matchesQuery(search, entry.name, entry.uuid, entry.reason));
  return (
    <PlayersPanel
      total={bans.length}
      shown={rows.length}
      query={query}
      onQuery={setQuery}
      head={head}
      empty={{ icon: Ban, title: t("bans.empty"), hint: t("bans.emptyHint") }}
      form={
        access.canManage && (
          <AddPlayerForm
            serverId={serverId}
            submitLabel={t("bans.add")}
            submitIcon={Ban}
            disabled={busy}
            extra={fields}
            onSubmit={async (player) => afterBan(await actions.ban({ name: player.name, ...ban() }))}
          />
        )
      }
    >
      {rows.map((entry) => (
        <PlayerRow
          key={entry.uuid || entry.name}
          name={entry.name}
          uuid={entry.uuid}
          badges={<BanExpiry ban={entry} />}
          detail={<BanDetail ban={entry} />}
          actions={pardonButton(() => void actions.pardon(entry.name))}
        />
      ))}
    </PlayersPanel>
  );
}
