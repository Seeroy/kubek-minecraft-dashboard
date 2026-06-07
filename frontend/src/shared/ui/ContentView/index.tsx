"use client";

import { usePathname } from "next/navigation";
import React, { ViewTransition } from "react";

export default function ContentView({
  children,
}: {
  children: React.ReactNode;
}) {
  // path only forces React to swap the subtree on navigation
  const pathname = usePathname();

  return (
    <ViewTransition enter="slide" exit="slide" key={pathname}>
      {children}
    </ViewTransition>
  );
}
