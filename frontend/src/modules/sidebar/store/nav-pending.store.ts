import { create } from "zustand";

// Nav link whose page is still loading, lets the sidebar react to the click at once
export const useNavPending = create<{ href: string | null; setHref: (href: string | null) => void }>((set) => ({
  href: null,
  setHref: (href) => set({ href }),
}));
