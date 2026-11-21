"use client";
import { useCompanion } from "@/modules/companion";

export function useLivePlayer(serverId: string, uuid: string | undefined) {
  const companion = useCompanion(serverId);
  if (!uuid || !companion.connected) return null;
  return companion.live?.stats?.players.find((player) => player.uuid === uuid) ?? null;
}
