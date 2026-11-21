"use client";
import type { PlayerDetails } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { RotateCcw } from "lucide-react";
import { useResetPlayerData } from "../../hooks/useResetPlayerData";
import { DetailsSection } from "./DetailsSection";

interface ResetPlayerDataProps {
  serverId: string;
  details: PlayerDetails;
  online: boolean;
}

export function ResetPlayerData({ serverId, details, online }: ResetPlayerDataProps) {
  const { t } = useTranslation("modules.players.details");
  const { reset, pending } = useResetPlayerData(serverId);

  return (
    <DetailsSection title={t("reset.title")} icon={RotateCcw} tone="red">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 px-3 py-2.5">
        <p className="min-w-0 flex-1 text-muted-foreground">{online ? t("reset.online") : t("reset.hint")}</p>
        <Button variant="destructive" disabled={online || pending || !details.savedAt} onClick={() => void reset(details.uuid, details.name ?? details.uuid)}>
          {pending ? <Spinner /> : <RotateCcw />}
          {t("reset.action")}
        </Button>
      </div>
    </DetailsSection>
  );
}
