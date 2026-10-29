"use client";
import { Button } from "@/shared/ui/button";
import { lazy, Suspense, useState, type ReactNode } from "react";

export const NotificationPrefsDialog = lazy(() => import("../modals/NotificationPrefsDialog"));

/** Opens the per-category channel settings */
export function NotificationPrefsButton({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {children}
      </Button>
      {open && (
        <Suspense>
          <NotificationPrefsDialog onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
