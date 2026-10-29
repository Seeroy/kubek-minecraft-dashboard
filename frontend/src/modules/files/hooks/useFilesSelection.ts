"use client";
import { useCallback, useMemo, useState } from "react";

export interface FilesSelection {
  selected: Set<string>;
  selectedPaths: string[];
  count: number;
  toggle: (path: string) => void;
  selectMany: (paths: string[], select: boolean) => void;
  clear: () => void;
}

export function useFilesSelection(): FilesSelection {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }, []);

  const selectMany = useCallback((paths: string[], select: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const path of paths) {
        if (select) next.add(path);
        else next.delete(path);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);
  const selectedPaths = useMemo(() => Array.from(selected), [selected]);

  return { selected, selectedPaths, count: selected.size, toggle, selectMany, clear };
}
