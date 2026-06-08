import { authHttp } from "@/shared/lib/http";
import type { IMainConfig } from "@shared/types/configs/mainConfig.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./query-keys";

export function useMainConfig() {
  return useQuery({
    queryKey: qk.config.main(),
    queryFn: () => authHttp.get<IMainConfig>("kubek/config"),
  });
}

export function useUpdateMainConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<IMainConfig>) =>
      authHttp.put<IMainConfig>("kubek/config", { json: data }),
    onSuccess: (config) => {
      queryClient.setQueryData(qk.config.main(), config);
    },
  });
}
