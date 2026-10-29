"use client";
import { useSocketApi } from "@/shared/context/socket-context";
import { qk } from "@/shared/queries/query-keys";
import {
  WsAssistantEventTypes,
  type WsAssistantDelta,
  type WsAssistantDone,
  type WsAssistantError,
  type WsAssistantMessage,
  type WsAssistantTool,
} from "@shared/types/ws/assistant-events.types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { patchConversation, upsertCall, upsertMessage } from "../api/assistant.queries";
import { assistantStream } from "../lib/stream-store";

/** Feeds assistant socket events into the stream store and the query cache */
export function useAssistantLive(enabled: boolean) {
  const { subscribe, unsubscribe } = useSocketApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const onDelta = ({ conversationId, messageId, text }: WsAssistantDelta) => assistantStream.append(conversationId, messageId, text);
    const onMessage = ({ conversationId, message }: WsAssistantMessage) => {
      patchConversation(queryClient, conversationId, (detail) => upsertMessage(detail, message));
      assistantStream.settle(conversationId, message.id);
    };
    const onTool = ({ conversationId, messageId, call }: WsAssistantTool) =>
      patchConversation(queryClient, conversationId, (detail) => upsertCall(detail, messageId, call));
    // Refetch once the turn ends, events sent before the cache existed are picked up here
    const onDone = ({ conversationId }: WsAssistantDone) => {
      assistantStream.setRunning(conversationId, false);
      void queryClient.invalidateQueries({ queryKey: qk.assistant.conversation(conversationId) });
      void queryClient.invalidateQueries({ queryKey: qk.assistant.conversations() });
    };
    const onError = ({ conversationId, error }: WsAssistantError) => {
      assistantStream.fail(conversationId, error);
      void queryClient.invalidateQueries({ queryKey: qk.assistant.conversation(conversationId) });
    };

    subscribe(WsAssistantEventTypes.DELTA, onDelta);
    subscribe(WsAssistantEventTypes.MESSAGE, onMessage);
    subscribe(WsAssistantEventTypes.TOOL, onTool);
    subscribe(WsAssistantEventTypes.CONFIRM, onTool);
    subscribe(WsAssistantEventTypes.DONE, onDone);
    subscribe(WsAssistantEventTypes.ERROR, onError);
    return () => {
      unsubscribe(WsAssistantEventTypes.DELTA, onDelta);
      unsubscribe(WsAssistantEventTypes.MESSAGE, onMessage);
      unsubscribe(WsAssistantEventTypes.TOOL, onTool);
      unsubscribe(WsAssistantEventTypes.CONFIRM, onTool);
      unsubscribe(WsAssistantEventTypes.DONE, onDone);
      unsubscribe(WsAssistantEventTypes.ERROR, onError);
    };
  }, [enabled, subscribe, unsubscribe, queryClient]);
}
