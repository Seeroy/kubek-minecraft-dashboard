import { api, type Network, type NetworkChangeResult, type NetworkWizardProps } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import { AccessArea } from "@shared/access/areas";
import { TaskStatus } from "@shared/types/task.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTaskWaiter } from "@/shared/hooks/useWatchedTask";

/** Network the server runs as proxy or belongs to */
export function useNetworkOf(serverId: string | undefined) {
  // Server lists render a badge per server, without networks read there is nothing to show
  const canRead = useAuthStore((s) => s.can(AccessArea.NETWORKS, "read"));
  return useQuery({
    queryKey: qk.networks.list(),
    queryFn: () => api.networks.list(),
    staleTime: 30_000,
    enabled: !!serverId && canRead,
    select: (networks: Network[]) => networks.find((n) => n.proxy.serverId === serverId || n.members.some((m) => m.serverId === serverId)) ?? null,
  });
}

export function useNetworkCandidates(enabled = true) {
  return useQuery({ queryKey: qk.networks.candidates(), queryFn: () => api.networks.candidates(), enabled });
}

/** Review of the wizard input, nothing is written on the server */
export function useNetworkPlan(props: NetworkWizardProps | null) {
  return useQuery({
    queryKey: qk.networks.plan(props),
    queryFn: () => api.networks.plan(props!),
    enabled: !!props,
    retry: false,
    // The review step shows the error inline
    meta: { silent: true },
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCreateNetworkMutation() {
  // The wizard shows its own localized notification
  return useMutation({ mutationFn: (props: NetworkWizardProps) => api.networks.create(props), meta: { silent: true } });
}

export type NetworkChange = { kind: "remove"; serverId: string } | { kind: "order"; order: string[] } | { kind: "rotate" } | { kind: "delete" };

/** Synchronous network edits, each one refreshes the list */
export function useNetworkChangeMutation(networkId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (change: NetworkChange) => {
      switch (change.kind) {
        case "remove":
          return api.networks.removeMember(networkId, change.serverId);
        case "order":
          return api.networks.setOrder(networkId, change.order);
        case "rotate":
          return api.networks.rotateSecret(networkId);
        case "delete":
          await api.networks.remove(networkId);
          return { networkId, restart: [] };
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.networks.all }),
  });
}

/** Adding is a task, Fabric needs a mod first, the mutation settles with it */
export function useAddNetworkMemberMutation(networkId: string) {
  const qc = useQueryClient();
  const waitFor = useTaskWaiter();
  return useMutation({
    mutationFn: async (serverId: string): Promise<NetworkChangeResult> => {
      const task = await waitFor((await api.networks.addMember(networkId, serverId)).taskId);
      if (task.status !== TaskStatus.SUCCESS) throw new Error(task.error?.message ?? "Task failed");
      return task.result as NetworkChangeResult;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.networks.all }),
  });
}
