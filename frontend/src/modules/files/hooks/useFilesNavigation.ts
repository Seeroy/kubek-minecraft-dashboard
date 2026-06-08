"use client";
import {
  getParentPath,
  normalizeFilesPath,
  splitFilesPath,
} from "@/modules/files/lib/path";
import { useCallback, useMemo, useState } from "react";

export interface FilesNavigation {
  currentPath: string;
  breadcrumbParts: string[];
  navigateToPath: (path: string) => void;
  navigateUp: () => void;
}

// Root is the empty string; all paths are normalized to a single canonical form
export function useFilesNavigation(initialPath: string = ""): FilesNavigation {
  const [currentPath, setCurrentPath] = useState<string>(() =>
    normalizeFilesPath(initialPath)
  );

  const navigateToPath = useCallback((path: string) => {
    setCurrentPath(normalizeFilesPath(path));
  }, []);

  const navigateUp = useCallback(() => {
    setCurrentPath((prev) => getParentPath(prev));
  }, []);

  const breadcrumbParts = useMemo(
    () => splitFilesPath(currentPath),
    [currentPath]
  );

  return { currentPath, breadcrumbParts, navigateToPath, navigateUp };
}
