"use client";

import { sectionPath } from "@/shared/lib/routeTabs";
import { usePathname } from "next/navigation";
import React, { ViewTransition } from "react";

export default function ContentView({
  children,
}: {
  children: React.ReactNode;
}) {
  // Keyed by section, a tab change inside a page keeps the page mounted
  const section = sectionPath(usePathname());

  return (
    <ViewTransition enter="slide" exit="slide" key={section}>
      {children}
    </ViewTransition>
  );
}
