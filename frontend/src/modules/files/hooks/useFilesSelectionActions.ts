"use client";
import type { FilesSelection } from "@/modules/files/hooks/useFilesSelection";
import { IFile } from "@shared/types/file.types";
import { useCallback } from "react";

export interface FilesSelectionActions {
  handleToggleSelect: (file: IFile) => void;
  handleToggleSelectAll: (paths: string[], allSelected: boolean) => void;
  handleSelectRange: (paths: string[]) => void;
}

export function useFilesSelectionActions(
  selection: FilesSelection
): FilesSelectionActions {
  const handleToggleSelect = useCallback(
    (file: IFile) => {
      selection.toggle(file.path);
    },
    [selection]
  );

  const handleToggleSelectAll = useCallback(
    (paths: string[], allSelected: boolean) => {
      if (allSelected) {
        const next = selection.selectedPaths.filter((p) => !paths.includes(p));
        selection.setSelection(next);
      } else {
        const next = new Set([...selection.selectedPaths, ...paths]);
        selection.setSelection(Array.from(next));
      }
    },
    [selection]
  );

  const handleSelectRange = useCallback(
    (paths: string[]) => {
      const next = new Set([...selection.selectedPaths, ...paths]);
      selection.setSelection(Array.from(next));
    },
    [selection]
  );

  return { handleToggleSelect, handleToggleSelectAll, handleSelectRange };
}
