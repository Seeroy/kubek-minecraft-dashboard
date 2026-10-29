import { api } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import type {
  AssistantConversationDetail,
  AssistantMessageContext,
  AssistantToolCall,
  IAssistantConversation,
  IAssistantMessage,
} from "@shared/types/assistant.types";
import { AccessArea } from "@shared/access/areas";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { assistantStream } from "../lib/stream-store";

export function useAssistantStatus() {
  const allowed = useAuthStore((s) => s.can(AccessArea.ASSISTANT, "read"));
  return useQuery({ queryKey: qk.assistant.status(), queryFn: api.assistant.status, enabled: allowed, staleTime: 60_000 });
}

/** True when the user may chat and an admin has set the assistant up */
export function useAssistantAvailable(): boolean {
  const status = useAssistantStatus().data;
  return !!status?.enabled && status.configured;
}

export function useConversationsQuery(enabled: boolean) {
  return useQuery({ queryKey: qk.assistant.conversations(), queryFn: api.assistant.conversations, enabled });
}

export function useConversationQuery(id: string | null) {
  return useQuery({
    queryKey: qk.assistant.conversation(id ?? ""),
    queryFn: () => api.assistant.conversation(id!),
    enabled: !!id,
  });
}

export function patchConversation(queryClient: QueryClient, id: string, patch: (detail: AssistantConversationDetail) => AssistantConversationDetail) {
  queryClient.setQueryData<AssistantConversationDetail>(qk.assistant.conversation(id), (detail) => (detail ? patch(detail) : detail));
}

export const upsertMessage = (detail: AssistantConversationDetail, message: IAssistantMessage): AssistantConversationDetail => {
  const exists = detail.messages.some((m) => m.id === message.id);
  return {
    ...detail,
    messages: exists ? detail.messages.map((m) => (m.id === message.id ? message : m)) : [...detail.messages, message],
  };
};

export const upsertCall = (detail: AssistantConversationDetail, messageId: string, call: AssistantToolCall): AssistantConversationDetail => ({
  ...detail,
  messages: detail.messages.map((m) => (m.id === messageId ? { ...m, toolCalls: m.toolCalls.map((c) => (c.id === call.id ? call : c)) } : m)),
});

export function useSendMessage(onStarted: (conversation: IAssistantConversation) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content, context }: { id: string | null; content: string; context: AssistantMessageContext }) =>
      api.assistant.send(id, content, context),
    onSuccess: ({ conversation, message }, { id }) => {
      assistantStream.setRunning(conversation.id, true);
      if (id) patchConversation(queryClient, id, (detail) => upsertMessage({ ...detail, conversation }, message));
      else
        queryClient.setQueryData<AssistantConversationDetail>(qk.assistant.conversation(conversation.id), { conversation, messages: [message], running: true });
      void queryClient.invalidateQueries({ queryKey: qk.assistant.conversations() });
      onStarted(conversation);
    },
  });
}

export function useConfirmCall(conversationId: string) {
  return useMutation({
    mutationFn: ({ callId, approve }: { callId: string; approve: boolean }) => api.assistant.confirm(conversationId, callId, approve),
    onSuccess: () => assistantStream.setRunning(conversationId, true),
  });
}

export function useStopConversation() {
  return useMutation({ mutationFn: (id: string) => api.assistant.stop(id) });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.assistant.remove(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<IAssistantConversation[]>(qk.assistant.conversations(), (list) => list?.filter((c) => c.id !== id));
      queryClient.removeQueries({ queryKey: qk.assistant.conversation(id) });
    },
  });
}
