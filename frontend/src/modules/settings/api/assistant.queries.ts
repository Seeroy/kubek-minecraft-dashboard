import { api } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import type { AssistantConnectionDraft, AssistantSettingsUpdate } from "@shared/types/assistant.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAssistantSettingsQuery() {
  return useQuery({ queryKey: qk.assistant.settings(), queryFn: api.assistant.getSettings });
}

export function useSaveAssistantSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: AssistantSettingsUpdate) => api.assistant.updateSettings(patch),
    onSuccess: (settings) => {
      queryClient.setQueryData(qk.assistant.settings(), (data: Awaited<ReturnType<typeof api.assistant.getSettings>> | undefined) =>
        data ? { ...data, settings } : data
      );
      void queryClient.invalidateQueries({ queryKey: qk.assistant.status() });
    },
  });
}

export function useAssistantModels() {
  return useMutation({ mutationFn: (draft: AssistantConnectionDraft) => api.assistant.models(draft) });
}

export function useTestAssistant() {
  return useMutation({ mutationFn: (draft: AssistantConnectionDraft) => api.assistant.test(draft) });
}
