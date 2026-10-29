import { create } from "zustand";

// DOM node pages portal their topbar buttons into
export const useTopbarSlot = create<{ node: HTMLElement | null; setNode: (node: HTMLElement | null) => void }>(
  (set) => ({ node: null, setNode: (node) => set({ node }) })
);
