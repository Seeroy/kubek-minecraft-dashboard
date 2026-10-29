"use client";
import type { PlayersOverview } from "@/api";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Switch } from "@/shared/ui/switch";
import { ListChecks, ShieldCheck, Trash2, UserPlus, UsersRound } from "lucide-react";
import { useState } from "react";
import type { PlayerActions } from "../hooks/usePlayerActions";
import type { PlayersAccess } from "../hooks/usePlayersAccess";
import { matchesQuery } from "../lib/players";
import { AddPlayerForm } from "./AddPlayerForm";
import { PlayerRow } from "./PlayerRow";
import { PlayersPanel } from "./PlayersPanel";

interface WhitelistTabProps {
  serverId: string;
  overview: PlayersOverview;
  /** Starting or stopping, changes would be lost */
  busy: boolean;
  access: PlayersAccess;
  actions: PlayerActions;
}

export function WhitelistTab({ serverId, overview, busy, access, actions }: WhitelistTabProps) {
  const { t } = useTranslation("modules.players");
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim().toLowerCase(), 150);
  const { settings, whitelist, live } = overview;
  const locked = !access.canManage || busy || actions.pending;
  // Entries need write, the switches are player settings and need manage
  const entriesLocked = !access.canWrite || busy || actions.pending;
  const rows = whitelist.filter((entry) => matchesQuery(search, entry.name, entry.uuid));

  return (
    <div className="grid gap-4">
      <SettingsGroup tone="green" icon={ShieldCheck} title={t("whitelist.group")} description={t("whitelist.groupHint")} className="mb-0">
        <SettingsField label={t("whitelist.toggle")} icon={ListChecks} hint={t("whitelist.toggleHint")} htmlFor="players-whitelist" inline>
          <Switch
            id="players-whitelist"
            checked={settings.whitelist}
            disabled={locked}
            onCheckedChange={(next) => void actions.updateSettings({ whitelist: next })}
          />
        </SettingsField>
        <SettingsField
          label={t("whitelist.enforce")}
          icon={ShieldCheck}
          hint={live ? t("whitelist.enforceRestart") : t("whitelist.enforceHint")}
          htmlFor="players-enforce"
          inline
        >
          <Switch
            id="players-enforce"
            checked={settings.enforceWhitelist}
            disabled={locked}
            onCheckedChange={(next) => void actions.updateSettings({ enforceWhitelist: next })}
          />
        </SettingsField>
      </SettingsGroup>

      <PlayersPanel
        total={whitelist.length}
        shown={rows.length}
        query={query}
        onQuery={setQuery}
        empty={{ icon: UsersRound, title: t("whitelist.empty"), hint: access.canWrite ? t("whitelist.emptyHint") : undefined }}
        form={
          access.canWrite && (
            <AddPlayerForm
              serverId={serverId}
              submitLabel={t("whitelist.add")}
              submitIcon={UserPlus}
              disabled={busy}
              onSubmit={(player) => actions.addToWhitelist(player.name)}
            />
          )
        }
      >
        {rows.map((entry) => (
          <PlayerRow
            key={entry.uuid || entry.name}
            name={entry.name}
            uuid={entry.uuid}
            actions={
              access.canWrite && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-danger/10 hover:text-danger"
                  disabled={entriesLocked}
                  title={t("actions.remove")}
                  aria-label={t("actions.remove")}
                  onClick={() => void actions.removeFromWhitelist(entry.name)}
                >
                  <Trash2 />
                </Button>
              )
            }
          />
        ))}
      </PlayersPanel>
    </div>
  );
}
