import { useCallback, useSyncExternalStore } from "react";

/** Live state of one conversation that is not in the query cache yet */
export interface LiveConversation {
  /** Undefined until a socket event or a send says otherwise */
  running?: boolean;
  /** Streamed text per assistant message id, dropped once the message is saved */
  drafts: Record<string, string>;
  error?: string;
}

const EMPTY: LiveConversation = { drafts: {} };

const state = new Map<string, LiveConversation>();
const listeners = new Set<() => void>();

function update(id: string, patch: (live: LiveConversation) => LiveConversation) {
  state.set(id, patch(state.get(id) ?? EMPTY));
  for (const listener of listeners) listener();
}

// Tokens land here so a delta re-renders only the streaming message, not the panel
export const assistantStream = {
  get: (id: string | null) => (id && state.get(id)) || EMPTY,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
  setRunning: (id: string, running: boolean) => update(id, (live) => ({ ...live, running, error: running ? undefined : live.error })),
  fail: (id: string, error: string) => update(id, (live) => ({ ...live, running: false, error })),
  append: (id: string, messageId: string, text: string) =>
    update(id, (live) => ({ ...live, running: true, drafts: { ...live.drafts, [messageId]: (live.drafts[messageId] ?? "") + text } })),
  settle(id: string, messageId: string) {
    if (!state.get(id)?.drafts[messageId]) return;
    update(id, (live) => {
      const drafts = { ...live.drafts };
      delete drafts[messageId];
      return { ...live, drafts };
    });
  },
};

export function useLiveConversation(id: string | null): LiveConversation {
  const snapshot = useCallback(() => assistantStream.get(id), [id]);
  return useSyncExternalStore(assistantStream.subscribe, snapshot, () => EMPTY);
}
