"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Ban, Crown, Ellipsis, Eye, ListChecks, RotateCcw, UserCheck, UserX } from "lucide-react";
import type { PlayerActions } from "../hooks/usePlayerActions";
import type { PlayersAccess } from "../hooks/usePlayersAccess";
import { useResetPlayerData } from "../hooks/useResetPlayerData";

export interface RowPlayer {
  name: string | null;
  uuid: string | null;
  online: boolean;
  isOp: boolean;
  isWhitelisted: boolean;
  isBanned: boolean;
}

interface PlayerRowMenuProps {
  serverId: string;
  player: RowPlayer;
  /** Whitelist, op and ban items need the lists */
  listsReady: boolean;
  access: PlayersAccess;
  actions: PlayerActions;
  onOpen: () => void;
}

export function PlayerRowMenu({ serverId, player, listsReady, access, actions, onOpen }: PlayerRowMenuProps) {
  const { t } = useTranslation("modules.players.actions");
  const { reset, pending: resetting } = useResetPlayerData(serverId);
  const { name, uuid, online } = player;
  const lists = !!name && listsReady && access.supported;
  const busy = actions.pending || resetting;

  return (
    // The menu renders in a portal, but its clicks still bubble to the row in React
    <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("menu", name ?? uuid ?? "")}
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70 data-popup-open:bg-hover [&_svg]:size-3.5"
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onOpen}>
            <Eye />
            {t("open")}
          </DropdownMenuItem>
          {name && lists && (access.canWrite || access.canManage) && <DropdownMenuSeparator />}
          {name && lists && access.canWrite && (
            <DropdownMenuItem
              disabled={busy}
              onClick={() => void (player.isWhitelisted ? actions.removeFromWhitelist(name) : actions.addToWhitelist(name))}
            >
              <ListChecks />
              {player.isWhitelisted ? t("unwhitelist") : t("whitelist")}
            </DropdownMenuItem>
          )}
          {name && lists && access.canManage && (
            <DropdownMenuItem disabled={busy} onClick={() => void (player.isOp ? actions.removeOp(name) : actions.addOp({ name }))}>
              <Crown />
              {player.isOp ? t("deop") : t("op")}
            </DropdownMenuItem>
          )}
          {name && online && access.canWrite && (
            <DropdownMenuItem variant="destructive" disabled={busy} onClick={() => void actions.kick(name)}>
              <UserX />
              {t("kick")}
            </DropdownMenuItem>
          )}
          {name && lists && access.canManage && (
            <DropdownMenuItem
              variant={player.isBanned ? undefined : "destructive"}
              disabled={busy}
              onClick={() => void (player.isBanned ? actions.pardon(name) : actions.banOnline(name))}
            >
              {player.isBanned ? <UserCheck /> : <Ban />}
              {player.isBanned ? t("pardon") : t("ban")}
            </DropdownMenuItem>
          )}
          {uuid && access.canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" disabled={busy || online} onClick={() => void reset(uuid, name ?? uuid)}>
                <RotateCcw />
                {t("reset")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
