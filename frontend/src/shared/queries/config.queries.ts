import { useAccess } from "@/shared/lib/access";
import { authHttp } from "@/shared/lib/http";
import { AccessArea } from "@shared/access/areas";
import type { ConfigSecrets, IMainConfig } from "@shared/types/configs/mainConfig.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./query-keys";

export function useMainConfig() {
  const allowed = useAccess([AccessArea.PANEL, "manage"]);
  return useQuery({
    queryKey: qk.config.main(),
    queryFn: () => authHttp.get<IMainConfig>("kubek/config"),
    enabled: allowed,
  });
}

export function useUpdateMainConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<IMainConfig>) => authHttp.put<IMainConfig>("kubek/config", { json: data }),
    onSuccess: (config) => {
      queryClient.setQueryData(qk.config.main(), config);
    },
  });
}

/** Stored value of one secret setting, fetched only when the user asks to see it */
export async function revealConfigSecret(path: keyof ConfigSecrets): Promise<string | null> {
  const { value } = await authHttp.get<{ value: string | null }>(`kubek/config/secrets/${path}`);
  return value;
}
