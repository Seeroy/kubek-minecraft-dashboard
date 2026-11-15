import { ASSISTANT_REASONING_LEVELS, type AssistantReasoningLevel } from "@shared/types/assistant.types";
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
  /** Desktop width in px, remembered across visits */
  width: number;
  setWidth: (width: number) => void;
  /** Write tools run without asking, remembered across visits */
  autoApprove: boolean;
  setAutoApprove: (on: boolean) => void;
  /** Composer switches, remembered across visits */
  reasoning: AssistantReasoningLevel;
  setReasoning: (level: AssistantReasoningLevel) => void;
  webSearch: boolean;
  setWebSearch: (on: boolean) => void;
  setOpen: (open: boolean) => void;
  showConversation: (id: string | null) => void;
  showList: () => void;
}

const WIDTH_KEY = "assistant_panel_width";
const AUTO_KEY = "assistant_auto_approve";
const REASONING_KEY = "assistant_reasoning";
const WEB_KEY = "assistant_web_search";

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode, keep it for this visit
  }
};
export const PANEL_WIDTH = { min: 360, initial: 440, max: 1100 };

export const clampPanelWidth = (width: number) => {
  // keep some of the page visible next to the panel
  const max = typeof window === "undefined" ? PANEL_WIDTH.max : Math.min(PANEL_WIDTH.max, window.innerWidth - 120);
  return Math.round(Math.max(PANEL_WIDTH.min, Math.min(max, width)));
};

const storedReasoning = (): AssistantReasoningLevel => {
  const value = read(REASONING_KEY) as AssistantReasoningLevel | null;
  return value && ASSISTANT_REASONING_LEVELS.includes(value) ? value : "auto";
};

const storedWidth = () => {
  const value = Number(read(WIDTH_KEY));
  return value ? clampPanelWidth(value) : PANEL_WIDTH.initial;
};

export const useAssistantPanel = create<PanelState>((set) => ({
  width: typeof window === "undefined" ? PANEL_WIDTH.initial : storedWidth(),
  setWidth: (width) => {
    const next = clampPanelWidth(width);
    set({ width: next });
    write(WIDTH_KEY, String(next));
  },
  autoApprove: typeof window !== "undefined" && read(AUTO_KEY) === "1",
  setAutoApprove: (autoApprove) => {
    set({ autoApprove });
    write(AUTO_KEY, autoApprove ? "1" : "0");
  },
  reasoning: typeof window === "undefined" ? "auto" : storedReasoning(),
  setReasoning: (reasoning) => {
    set({ reasoning });
    write(REASONING_KEY, reasoning);
  },
  webSearch: typeof window !== "undefined" && read(WEB_KEY) === "1",
  setWebSearch: (webSearch) => {
    set({ webSearch });
    write(WEB_KEY, webSearch ? "1" : "0");
  },
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

/** Run switches sent with a message and with every decision that resumes the run */
export function runOptions() {
  const { autoApprove, reasoning, webSearch } = useAssistantPanel.getState();
  return { autoApprove, reasoning, webSearch };
}
