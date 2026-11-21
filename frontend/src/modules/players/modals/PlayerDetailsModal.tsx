"use client";
import type { PlayerDetails } from "@/api";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/shared/ui/dialog";
import { LoadError } from "@/shared/ui/load-error";
import { Skeleton } from "@/shared/ui/skeleton";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { History, UserRound } from "lucide-react";
import { useState } from "react";
import { usePlayerDetails } from "../api/players.queries";
import { useLivePlayer } from "../hooks/useLivePlayer";
import { usePlayerPresence } from "../hooks/usePlayerPresence";
import { usePlayersAccess, type PlayersAccess } from "../hooks/usePlayersAccess";
import { withLive } from "../lib/player-details";
import { PlayerAccess } from "../ui/details/PlayerAccess";
import { PlayerActivity } from "../ui/details/PlayerActivity";
import { PlayerControls } from "../ui/details/PlayerControls";
import { PlayerIdentity } from "../ui/details/PlayerIdentity";
import { PlayerState } from "../ui/details/PlayerState";
import { PlayerStatsList } from "../ui/details/PlayerStatsList";
import { ResetPlayerData } from "../ui/details/ResetPlayerData";
import { SavedNote } from "../ui/details/SavedNote";

export interface PlayerDetailsProps {
  serverId: string;
  blueprintId?: string;
  /** UUID, or the name for an online player the status query only knows by name */
  id: string;
  /** From the row, shown until the details arrive */
  name: string | null;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "players/details": { props: PlayerDetailsProps; result: void };
  }
}

// Based on the Players extension dialog by limeskat, github.com/limeskat/kubek-extension-players
export const PLAYER_DETAILS_MODAL_ID = "players/details";

type View = "overview" | "activity";

function DetailsSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}

interface OverviewProps {
  serverId: string;
  details: PlayerDetails;
  access: PlayersAccess;
}

function Overview({ serverId, details, access }: OverviewProps) {
  const { online, legacy } = usePlayerPresence(serverId, details.name);
  const live = useLivePlayer(serverId, details.uuid);
  const state = withLive(details, live);

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-8">
      <div className="lg:col-span-2">
        <SavedNote details={details} online={online} live={!!live} />
      </div>
      <div className="grid content-start gap-5">
        <PlayerState details={state} />
        {details.stats && <PlayerStatsList stats={details.stats} />}
      </div>
      <div className="grid content-start gap-5">
        {details.name && <PlayerAccess serverId={serverId} name={details.name} access={access} />}
        {online && details.name && access.canWrite && <PlayerControls serverId={serverId} name={details.name} gamemode={state.gamemode} legacy={legacy} />}
        {access.canManage && <ResetPlayerData serverId={serverId} details={details} online={online} />}
      </div>
    </div>
  );
}

function PlayerDetailsModal({ isOpen, onClose, serverId, blueprintId, id, name }: ModalProps & PlayerDetailsProps) {
  const { t } = useTranslation("modules.players.details");
  const query = usePlayerDetails(serverId, id);
  const access = usePlayersAccess(serverId, blueprintId);
  const [view, setView] = useState<View>("overview");
  const details = query.data;
  const shownName = details?.name ?? name;
  const { online } = usePlayerPresence(serverId, shownName);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg lg:max-w-4xl">
        <DialogHeader className="gap-3">
          <PlayerIdentity name={shownName} uuid={details?.uuid ?? id} online={online} />
          <ToggleGroup variant="segmented" value={[view]} onValueChange={(next) => next[0] && setView(next[0] as View)} aria-label={t("view")}>
            <Toggle variant="segmented" value="overview">
              <UserRound />
              {t("overview")}
            </Toggle>
            <Toggle variant="segmented" value="activity">
              <History />
              {t("activity.title")}
            </Toggle>
          </ToggleGroup>
        </DialogHeader>
        <DialogBody>
          {query.isError && !details ? (
            <LoadError onRetry={() => void query.refetch()} className="border-0 py-6" />
          ) : !details ? (
            <DetailsSkeleton />
          ) : view === "overview" ? (
            <Overview serverId={serverId} details={details} access={access} />
          ) : (
            <PlayerActivity serverId={serverId} uuid={details.uuid} />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export function PlayerDetailsModalRegistration() {
  useThisModal({ id: PLAYER_DETAILS_MODAL_ID, component: PlayerDetailsModal, module: "players" });
  return null;
}
