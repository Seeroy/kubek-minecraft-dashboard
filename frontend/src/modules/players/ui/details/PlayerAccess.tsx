"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Switch } from "@/shared/ui/switch";
import { Ban, Crown, ListChecks, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { usePlayersOverview } from "../../api/players.queries";
import { usePlayerActions } from "../../hooks/usePlayerActions";
import type { PlayersAccess } from "../../hooks/usePlayersAccess";
import { listsLookup } from "../../lib/players";
import { DetailsSection } from "./DetailsSection";
import { IconLabel } from "./IconLabel";

interface PlayerAccessProps {
  serverId: string;
  name: string;
  access: PlayersAccess;
}

/** Goes by name, so offline players work too */
export function PlayerAccess({ serverId, name, access }: PlayerAccessProps) {
  const { t } = useTranslation("modules.players.details.access");
  const { data: overview } = usePlayersOverview(serverId, access.supported && access.canView);
  const actions = usePlayerActions(serverId);
  const lookup = useMemo(() => listsLookup(overview), [overview]);
  if (!overview) return null;

  const key = name.toLowerCase();
  const op = lookup.ops.get(key);
  const rows = [
    {
      id: "whitelist",
      label: t("whitelist"),
      icon: ListChecks,
      tone: "green" as const,
      checked: lookup.whitelist.has(key),
      allowed: access.canWrite,
      toggle: (on: boolean) => (on ? actions.addToWhitelist(name) : actions.removeFromWhitelist(name)),
    },
    {
      id: "op",
      label: op ? t("opLevel", op.level) : t("op"),
      icon: Crown,
      tone: "amber" as const,
      checked: !!op,
      allowed: access.canManage,
      toggle: (on: boolean) => (on ? actions.addOp({ name }) : actions.removeOp(name)),
    },
    {
      id: "ban",
      label: t("banned"),
      icon: Ban,
      tone: "red" as const,
      checked: lookup.bans.has(key),
      allowed: access.canManage,
      toggle: (on: boolean) => (on ? actions.banOnline(name) : actions.pardon(name)),
    },
  ];

  return (
    <DetailsSection title={t("title")} icon={ShieldCheck} tone="green">
      <div className="grid divide-y divide-border rounded-lg border border-border">
        {rows.map((row) => (
          <label key={row.id} htmlFor={`player-${row.id}`} className="flex items-center justify-between gap-3 px-3 py-2">
            <IconLabel icon={row.icon} tone={row.tone}>
              {row.label}
            </IconLabel>
            <Switch
              id={`player-${row.id}`}
              checked={row.checked}
              disabled={!row.allowed || actions.pending}
              onCheckedChange={(next) => void row.toggle(next)}
            />
          </label>
        ))}
      </div>
    </DetailsSection>
  );
}
