"use client";

import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { Button } from "@/shared/ui/button";
import { AccessArea } from "@shared/access/areas";
import { Construction, Megaphone } from "lucide-react";
import Link from "next/link";
import { useCompanion } from "../../hooks/useCompanion";
import { MESSAGE_PLAYERS_MODAL_ID } from "../../modals/MessagePlayersModal";
import { CompanionLock } from "../CompanionLock";

/** Message button for the players page header, plus a pointer while maintenance is on */
export function CompanionPlayerActions({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.companion.players");
  const { openModal } = useModal();
  const { state, overview } = useCompanion(serverId);
  const canMessage = useAccess([AccessArea.PLAYERS, "write"], serverId);

  if (state === "loading" || state === "unsupported") return null;
  const locked = state !== "connected";

  return (
    <>
      {overview?.maintenance?.enabled && (
        // Configured in the server settings, here it's only a reminder
        <Button variant="outline" className="border-warn/40 text-warn hover:text-warn" nativeButton={false} render={<Link href="/server-settings/companion" />}>
          <Construction />
          {t("maintenanceOn")}
        </Button>
      )}
      {canMessage && (
        <CompanionLock state={state} locked={locked}>
          <Button variant="outline" disabled={locked} onClick={() => openModal(MESSAGE_PLAYERS_MODAL_ID, { serverId })}>
            <Megaphone />
            {t("message")}
          </Button>
        </CompanionLock>
      )}
    </>
  );
}
