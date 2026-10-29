"use client";

import { api } from "@/api";
import { useMutation } from "@tanstack/react-query";

export type ServerAction = "start" | "stop" | "restart" | "kill";

const run: Record<ServerAction, (id: string) => Promise<void>> = {
  start: (id) => api.servers.start(id),
  stop: (id) => api.servers.stop(id),
  restart: (id) => api.servers.restart(id),
  kill: (id) => api.servers.kill(id),
};

/** Power actions for one server, status changes arrive over the socket */
export function useServerActions(serverId: string | undefined) {
  const mutation = useMutation({
    mutationFn: (action: ServerAction) => run[action](serverId!),
  });

  return {
    perform: (action: ServerAction) => {
      if (serverId) mutation.mutate(action);
    },
    pending: mutation.isPending ? mutation.variables : null,
  };
}
