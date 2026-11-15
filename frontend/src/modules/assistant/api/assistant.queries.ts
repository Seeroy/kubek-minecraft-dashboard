import { api } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import type {
  AssistantAttachmentInput,
  AssistantConversationDetail,
  AssistantMessageContext,
  AssistantToolCall,
  IAssistantConversation,
  IAssistantMessage,
} from "@shared/types/assistant.types";
import { AccessArea } from "@shared/access/areas";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { runOptions } from "../lib/panel-store";
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
    mutationFn: ({
      id,
      content,
      context,
      attachments,
    }: {
      id: string | null;
      content: string;
      context: AssistantMessageContext;
      attachments?: AssistantAttachmentInput[];
    }) => api.assistant.send(id, content, { ...context, ...runOptions() }, attachments),
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
    // The rest of the run follows the composer switches
    mutationFn: ({ callId, approve }: { callId: string; approve: boolean }) =>
      api.assistant.confirm(conversationId, callId, approve, runOptions()),
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

/** Object URL of an attached file, img tags cannot send the session token themselves */
export function useAttachmentUrl(conversationId: string, attachmentId: string) {
  return useQuery({
    queryKey: [...qk.assistant.conversation(conversationId), "attachment", attachmentId],
    queryFn: async () => URL.createObjectURL(await api.assistant.attachment(conversationId, attachmentId)),
    // Kept for the session, so the URL is made once and never revoked while shown
    staleTime: Infinity,
    gcTime: Infinity,
  }).data;
}
