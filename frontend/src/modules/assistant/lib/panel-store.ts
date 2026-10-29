import { create } from "zustand";

interface PanelState {
  open: boolean;
  /** Conversation shown in the chat, null for a new one */
  conversationId: string | null;
  view: "chat" | "list";
  /** Text put into the composer of a new chat by an entry point like "Explain" */
  prefill: string | null;
  /** Bumped on every prefill so the composer picks it up again */
  prefillKey: number;
  setOpen: (open: boolean) => void;
  showConversation: (id: string | null) => void;
  showList: () => void;
}

export const useAssistantPanel = create<PanelState>((set) => ({
  open: false,
  conversationId: null,
  view: "chat",
  prefill: null,
  prefillKey: 0,
  setOpen: (open) => set({ open }),
  showConversation: (conversationId) => set({ conversationId, view: "chat", prefill: null }),
  showList: () => set({ view: "list" }),
}));

/** Opens a fresh chat with a ready prompt, the user still sends it */
export function openAssistantWith(prompt: string) {
  useAssistantPanel.setState((state) => ({ open: true, view: "chat", conversationId: null, prefill: prompt, prefillKey: state.prefillKey + 1 }));
}
