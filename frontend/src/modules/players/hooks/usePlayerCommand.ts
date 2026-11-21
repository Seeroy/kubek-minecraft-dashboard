"use client";
import { useNotifications } from "@/modules/notifications";
import { usePlayerCommandMutation, type PlayerCommand } from "../api/players.queries";
import { usePlayersError } from "./usePlayersError";

export function usePlayerCommand(serverId: string) {
  const { notify } = useNotifications();
  const errorText = usePlayersError();
  const mutation = usePlayerCommandMutation(serverId);

  const run = async (command: PlayerCommand, success: string) => {
    try {
      await mutation.mutateAsync(command);
      notify({ type: "success", title: success });
    } catch (error) {
      notify({ type: "error", title: errorText(error) });
    }
  };

  return { run, pending: mutation.isPending };
}
