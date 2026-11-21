"use client";
import type { PlayerGamemode } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Zap } from "lucide-react";
import { usePlayerCommand } from "../../hooks/usePlayerCommand";
import { DetailsSection } from "./DetailsSection";
import { QuickActions } from "./QuickActions";
import { TeleportForm } from "./TeleportForm";

interface PlayerControlsProps {
  serverId: string;
  name: string;
  gamemode: PlayerGamemode | null;
  legacy: boolean;
}

export function PlayerControls({ serverId, name, gamemode, legacy }: PlayerControlsProps) {
  const { t } = useTranslation("modules.players.details");
  const command = usePlayerCommand(serverId);

  return (
    <DetailsSection title={t("actions")} icon={Zap} tone="amber">
      <div className="grid gap-3">
        <QuickActions name={name} gamemode={gamemode} command={command} />
        <TeleportForm name={name} legacy={legacy} command={command} />
      </div>
    </DetailsSection>
  );
}
