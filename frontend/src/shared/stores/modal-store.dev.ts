import { useModalStore } from "./modal-store";

declare global {
  interface Window {
    // Manual inspector exposed by installModalDevtools(); call __modals() in DevTools
    __modals?: () => void;
  }
}

/**
 * Dev-only registry logging
 */
export function installModalDevtools() {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return;
  }

  const printRegistry = () => {
    const { modals, activeModals } = useModalStore.getState();
    const rows = Array.from(modals.values())
      .map((m) => ({
        id: m.id,
        module: m.module ?? "-",
        component: m.component.displayName || m.component.name || "Anonymous",
        active: activeModals.has(m.id),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    console.groupCollapsed(`[modals] registered: ${rows.length}`);
    console.table(rows);
    console.groupEnd();
  };

  let logTimer: ReturnType<typeof setTimeout> | null = null;
  useModalStore.subscribe((state, prev) => {
    if (state.modals === prev.modals) return;
    if (logTimer) clearTimeout(logTimer);
    logTimer = setTimeout(printRegistry, 250);
  });

  window.__modals = printRegistry;
}
