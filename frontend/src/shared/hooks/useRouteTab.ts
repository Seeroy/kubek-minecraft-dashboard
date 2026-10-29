import { usePathname } from "next/navigation";
import { useCallback } from "react";

/**
 * Tab kept in the path, /panel-settings/telegram. The default tab lives on the bare section path.
 * Switching goes through history.replaceState, Next keeps usePathname in sync and the page
 * stays mounted, so unsaved form edits survive a tab change
 */
export function useRouteTab<T extends string>(base: string, tabs: readonly T[], fallback: T): [T, (next: T) => void] {
  const pathname = usePathname();
  const segment = pathname.startsWith(base) ? pathname.slice(base.length).split("/")[1] : undefined;
  const tab = tabs.includes(segment as T) ? (segment as T) : fallback;

  const setTab = useCallback(
    (next: T) => window.history.replaceState(null, "", next === fallback ? base : `${base}/${next}`),
    [base, fallback]
  );

  return [tab, setTab];
}
