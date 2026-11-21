"use client";
import { useModal } from "@/shared/hooks/useModalsManager";
import { PLAYER_DETAILS_MODAL_ID } from "../modals/PlayerDetailsModal";

/** id can be a name when that's all the row has */
export function useOpenPlayer(serverId: string, blueprintId: string | undefined) {
  const { openModal } = useModal();
  return (id: string, name: string | null) => openModal(PLAYER_DETAILS_MODAL_ID, { serverId, blueprintId, id, name });
}
