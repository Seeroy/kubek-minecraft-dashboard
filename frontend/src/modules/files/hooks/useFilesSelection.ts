"use client";
import { useCallback, useMemo, useState } from "react";

export interface FilesSelection {
  selected: Set<string>;
  selectedPaths: string[];
  count: number;
  isSelected: (path: string) => boolean;
  toggle: (path: string) => void;
  setSelection: (paths: string[]) => void;
  selectAll: (paths: string[]) => void;
  clear: () => void;
}

export function useFilesSelection(): FilesSelection {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const setSelection = useCallback((paths: string[]) => {
    setSelected(new Set(paths));
  }, []);

  const selectAll = useCallback((paths: string[]) => {
    setSelected(new Set(paths));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback(
    (path: string) => selected.has(path),
    [selected]
  );

  const selectedPaths = useMemo(() => Array.from(selected), [selected]);

  return {
    selected,
    selectedPaths,
    count: selected.size,
    isSelected,
    toggle,
    setSelection,
    selectAll,
    clear,
  };
}
