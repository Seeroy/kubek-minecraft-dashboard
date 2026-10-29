import { create } from "zustand";

// Shared so a toast can open the popover and the hook knows it's open
export const useInboxPopover = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
