"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTopbarSlot } from "../store";

/** Renders page specific buttons on the right side of the topbar */
export function TopbarActions({ children }: { children: ReactNode }) {
  const node = useTopbarSlot((s) => s.node);
  return node ? createPortal(children, node) : null;
}
