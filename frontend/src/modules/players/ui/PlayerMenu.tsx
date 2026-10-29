"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Ban, Crown, Ellipsis, UserX } from "lucide-react";
import type { PlayerActions } from "../hooks/usePlayerActions";
import type { PlayersAccess } from "../hooks/usePlayersAccess";

interface PlayerMenuProps {
  name: string;
  isOp: boolean;
  /** Ban needs the lists, kick only needs a running server */
  listsReady: boolean;
  access: PlayersAccess;
  actions: PlayerActions;
  className?: string;
}

/** Kick, operator and ban for a player who is online */
export function PlayerMenu({ name, isOp, listsReady, access, actions, className }: PlayerMenuProps) {
  const { t } = useTranslation("modules.players.actions");
  const canEditLists = listsReady && access.supported && access.canManage;
  if (!access.canWrite && !canEditLists) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("menu", name)}
        className={cn(
          "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70 data-popup-open:bg-hover [&_svg]:size-3.5",
          className
        )}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canEditLists && (
          <DropdownMenuItem disabled={actions.pending} onClick={() => void (isOp ? actions.removeOp(name) : actions.addOp({ name }))}>
            <Crown />
            {isOp ? t("deop") : t("op")}
          </DropdownMenuItem>
        )}
        {canEditLists && access.canWrite && <DropdownMenuSeparator />}
        {access.canWrite && (
          <DropdownMenuItem variant="destructive" disabled={actions.pending} onClick={() => void actions.kick(name)}>
            <UserX />
            {t("kick")}
          </DropdownMenuItem>
        )}
        {canEditLists && (
          <DropdownMenuItem variant="destructive" disabled={actions.pending} onClick={() => void actions.banOnline(name)}>
            <Ban />
            {t("ban")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
