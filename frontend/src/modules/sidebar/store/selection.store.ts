import { create } from "zustand";

interface SelectionState {
  mode: boolean;
  selectedIds: string[];
  enable: () => void;
  disable: () => void;
  toggle: (id: string) => void;
  // Toggle a group of ids: if all are selected, deselect them; otherwise select all of them
  toggleGroup: (ids: string[]) => void;
  set: (ids: string[]) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useServerSelectionStore = create<SelectionState>((set, get) => ({
  mode: false,
  selectedIds: [],
  enable: () => set({ mode: true }),
  disable: () => set({ mode: false, selectedIds: [] }),
  toggle: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  toggleGroup: (ids) =>
    set((s) => {
      if (ids.length === 0) return s;
      const current = new Set(s.selectedIds);
      const allSelected = ids.every((id) => current.has(id));
      if (allSelected) {
        for (const id of ids) current.delete(id);
      } else {
        for (const id of ids) current.add(id);
      }
      return { selectedIds: Array.from(current) };
    }),
  set: (ids) => set({ selectedIds: ids }),
  clear: () => set({ selectedIds: [] }),
  has: (id) => get().selectedIds.includes(id),
}));
