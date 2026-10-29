import {
  applySidebarLayout,
  clampSidebarWidth,
  readSidebarLayout,
  SIDEBAR,
} from "@/shared/lib/sidebar-layout";
import { create } from "zustand";

interface SidebarState {
  // Drawer on narrow screens
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  // Desktop column, mirrored to --sbw and html.sb-mini
  width: number;
  mini: boolean;
  setWidth: (width: number) => void;
  setMini: (mini: boolean) => void;
  toggleMini: () => void;
}

const initialLayout =
  typeof window === "undefined" ? { width: SIDEBAR.initial, mini: false } : readSidebarLayout();

export const useSidebarStore = create<SidebarState>((set, get) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  ...initialLayout,
  setWidth: (width) => {
    const next = { width: clampSidebarWidth(width), mini: false };
    applySidebarLayout(next);
    set(next);
  },
  setMini: (mini) => {
    const next = { width: get().width, mini };
    applySidebarLayout(next);
    set({ mini });
  },
  toggleMini: () => get().setMini(!get().mini),
}));
