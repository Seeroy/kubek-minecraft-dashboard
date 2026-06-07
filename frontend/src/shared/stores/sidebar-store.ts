import { LucideIcon, ShieldQuestion } from "lucide-react";
import { create } from "zustand";

interface CurrentPageState {
  name: string;
  icon: LucideIcon;
  setPage: (name: string, icon: LucideIcon) => void;
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
}

export const useSidebarStore = create<CurrentPageState>((set) => ({
  name: "Unknown",
  icon: ShieldQuestion,
  setPage: (name, icon) => set({ name, icon }),
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  close: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
}));
