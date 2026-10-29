"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  clampSidebarWidth,
  SIDEBAR,
  setSidebarWidthVar,
} from "@/shared/lib/sidebar-layout";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { useEffect, type KeyboardEvent, type PointerEvent } from "react";

const KEY_STEP = 16;

/** Drag handle on the sidebar edge, collapses to icons when pulled far left */
export function SidebarResizer() {
  const { t } = useTranslation("modules.sidebar.layout");
  const width = useSidebarStore((s) => s.width);
  const mini = useSidebarStore((s) => s.mini);
  const setWidth = useSidebarStore((s) => s.setWidth);
  const setMini = useSidebarStore((s) => s.setMini);
  const toggleMini = useSidebarStore((s) => s.toggleMini);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleMini();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleMini]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const root = document.documentElement;
    root.classList.add("sb-dragging");

    // Width only goes to the CSS var while moving, the store is written once on release
    let collapsed = mini;
    let lastWidth = width;

    const onMove = (move: globalThis.PointerEvent) => {
      collapsed = move.clientX < SIDEBAR.collapseBelow;
      if (collapsed) {
        setSidebarWidthVar(SIDEBAR.mini);
        return;
      }
      lastWidth = clampSidebarWidth(move.clientX);
      setSidebarWidthVar(lastWidth);
    };
    const onUp = () => {
      root.classList.remove("sb-dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (collapsed) setMini(true);
      else setWidth(lastWidth);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? KEY_STEP : -KEY_STEP;
    setWidth((mini ? SIDEBAR.min : width) + delta);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t("resize")}
      aria-valuemin={SIDEBAR.min}
      aria-valuemax={SIDEBAR.max}
      aria-valuenow={mini ? SIDEBAR.mini : width}
      tabIndex={0}
      title={t("resizeHint")}
      onPointerDown={onPointerDown}
      onDoubleClick={toggleMini}
      onKeyDown={onKeyDown}
      className="group/resizer absolute top-0 -right-1 z-40 hidden h-full w-2 cursor-col-resize touch-none outline-none md:block"
    >
      <span className="absolute inset-y-0 left-[3px] w-0.5 bg-primary opacity-0 transition-opacity group-hover/resizer:opacity-70 group-focus-visible/resizer:opacity-70 in-[.sb-dragging]:opacity-70" />
      <span className="absolute top-1/2 left-1/2 grid h-7 w-2 -translate-1/2 scale-85 place-items-center rounded-[4px] border border-border bg-popover opacity-0 shadow-sm transition-[opacity,scale] duration-200 ease-smooth group-hover/resizer:scale-100 group-hover/resizer:opacity-100 in-[.sb-dragging]:scale-100 in-[.sb-dragging]:opacity-100">
        <span className="h-3.5 w-0.5 bg-[radial-gradient(circle,var(--muted-foreground)_1px,transparent_1.2px)] bg-size-[2px_5px] bg-repeat-y" />
      </span>
    </div>
  );
}
