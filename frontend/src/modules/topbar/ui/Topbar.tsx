"use client";

import { AssistantButton } from "@/modules/assistant";
import { InboxBell } from "@/modules/inbox";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { Button } from "@/shared/ui/button";
import { Menu } from "lucide-react";
import { Suspense } from "react";
import { useTopbarSlot } from "../store";
import { Crumbs } from "./Crumbs";

export function Topbar() {
  const { t } = useTranslation("modules.sidebar.layout");
  const openSidebar = useSidebarStore((s) => s.open);
  const setSlot = useTopbarSlot((s) => s.setNode);

  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={openSidebar} aria-label={t("openMenu")}>
        <Menu />
      </Button>
      <Suspense>
        <Crumbs />
      </Suspense>
      <div ref={setSlot} className="ml-auto flex items-center gap-1" />
      <AssistantButton />
      <InboxBell />
    </header>
  );
}
