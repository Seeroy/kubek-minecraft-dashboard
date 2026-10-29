import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useBotInfoQuery(enabled: boolean) {
  return useQuery({
    queryKey: qk.telegram.botInfo(),
    queryFn: () => api.telegramBot.getBotInfo(),
    enabled,
    meta: { silent: true },
  });
}

// Keyed by bot id, a new token with another bot fetches its own photo
export function useBotAvatarQuery(botId: number | undefined, hasAvatar: boolean) {
  return useQuery({
    queryKey: qk.telegram.botAvatar(botId ?? 0),
    queryFn: () => api.telegramBot.getBotAvatar(),
    enabled: !!botId && hasAvatar,
    staleTime: Infinity,
    retry: false,
  });
}

export function useLinkedUsersQuery(enabled: boolean) {
  return useQuery({
    queryKey: qk.telegram.linkedUsers(),
    queryFn: () => api.telegramBot.getLinkedUsers(),
    enabled,
  });
}

export function useUnlinkUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (telegramId: number) => api.telegramBot.unlinkUser(telegramId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.telegram.linkedUsers() });
    },
  });
}

export function useGenerateOtpMutation() {
  return useMutation({
    mutationFn: () => api.telegramBot.generateOtp(),
  });
}
