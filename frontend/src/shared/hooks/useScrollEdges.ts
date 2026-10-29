"use client";
import { useEffect, useState } from "react";

export interface ScrollEdges {
  /** Content is wider than the box */
  overflow: boolean;
  /** Hidden content to the left */
  start: boolean;
  /** Hidden content to the right */
  end: boolean;
}

const NONE: ScrollEdges = { overflow: false, start: false, end: false };

const read = (el: HTMLElement): ScrollEdges => {
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 1) return NONE;
  return { overflow: true, start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 };
};

const same = (a: ScrollEdges, b: ScrollEdges) => a.overflow === b.overflow && a.start === b.start && a.end === b.end;

/** Horizontal overflow of a scroll box, re-renders only when an edge changes */
export function useScrollEdges(el: HTMLElement | null): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NONE);

  useEffect(() => {
    if (!el) return;
    const update = () => {
      const next = read(el);
      setEdges((prev) => (same(prev, next) ? prev : next));
    };

    // Watch children too, a longer label can grow content without resizing the box
    const resize = new ResizeObserver(update);
    const observeAll = () => {
      resize.disconnect();
      resize.observe(el);
      for (const child of el.children) resize.observe(child);
    };
    const mutations = new MutationObserver(() => {
      observeAll();
      update();
    });

    observeAll();
    mutations.observe(el, { childList: true });
    el.addEventListener("scroll", update, { passive: true });
    update();

    return () => {
      resize.disconnect();
      mutations.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [el]);

  return edges;
}
