"use client";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useAccess } from "@/shared/lib/access";
import { playerListsAllowed } from "@/shared/lib/serverRestrictions";
import { AccessArea } from "@shared/access/areas";

/** What the current user may do with the players of a server of this blueprint */
export function usePlayersAccess(serverId: string, blueprintId: string | undefined) {
  const blueprint = useBlueprint(blueprintId);
  const canView = useAccess([AccessArea.PLAYERS, "read"], serverId);
  // Whitelist entries and kick
  const canWrite = useAccess([AccessArea.PLAYERS, "write"], serverId);
  // Operators, bans and player settings
  const canManage = useAccess([AccessArea.PLAYERS, "manage"], serverId);

  return {
    // The blueprint list needs servers write, without it the API has the last word
    supported: !blueprint || playerListsAllowed(blueprint),
    canView,
    canWrite,
    canManage,
  };
}

export type PlayersAccess = ReturnType<typeof usePlayersAccess>;
