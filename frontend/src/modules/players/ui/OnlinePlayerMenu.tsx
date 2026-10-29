"use client";
import { usePlayersOverview } from "../api/players.queries";
import { usePlayerActions } from "../hooks/usePlayerActions";
import { usePlayersAccess } from "../hooks/usePlayersAccess";
import { PlayerMenu } from "./PlayerMenu";

interface OnlinePlayerMenuProps {
  serverId: string;
  blueprintId?: string;
  name: string;
  className?: string;
}

/** Player actions outside the players page, the console popover for one */
export function OnlinePlayerMenu({ serverId, blueprintId, name, className }: OnlinePlayerMenuProps) {
  const access = usePlayersAccess(serverId, blueprintId);
  const { data: overview } = usePlayersOverview(serverId, access.supported && access.canView);
  const actions = usePlayerActions(serverId);
  const isOp = !!overview?.ops.some((op) => op.name.toLowerCase() === name.toLowerCase());

  return <PlayerMenu name={name} isOp={isOp} listsReady={!!overview} access={access} actions={actions} className={className} />;
}
