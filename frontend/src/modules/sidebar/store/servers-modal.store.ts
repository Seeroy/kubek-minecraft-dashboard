import { create } from "zustand";

// The "All servers" dialog opens from the switcher, the dashboard and Shift+S
export const useServersModal = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
