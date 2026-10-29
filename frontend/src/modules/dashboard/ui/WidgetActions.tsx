"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const WidgetActionsSlot = createContext<HTMLElement | null>(null);
export const WidgetMetaSlot = createContext<HTMLElement | null>(null);

/** Puts controls into the header of the widget that renders it */
export function WidgetActions({ children }: { children: ReactNode }) {
  const node = useContext(WidgetActionsSlot);
  return node ? createPortal(children, node) : null;
}

/** Small counter or note right after the widget title */
export function WidgetMeta({ children }: { children: ReactNode }) {
  const node = useContext(WidgetMetaSlot);
  return node ? createPortal(children, node) : null;
}
