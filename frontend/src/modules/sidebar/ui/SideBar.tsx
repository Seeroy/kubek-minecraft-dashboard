"use client";
import { useCommandPalette } from "@/modules/command-palette/hooks/useCommandPalette";
import HostMetrics from "@/modules/sidebar/ui/HostMetrics";
import ServerAddressRow from "@/modules/sidebar/ui/ServerAddressRow";
import { usePlatformModifier } from "@/shared/hooks/usePlatformModifier";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { Button } from "@/shared/ui/button";
import { Kbd } from "@/shared/ui/kbd";
import LogoV2 from "@/shared/ui/logo-v2";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import Navigation from "./Navigation";
import ServerControls from "./ServerControls";
import ServersList from "./ServersList";
import { ServerSwitcher } from "./ServerSwitcher";
import { SidebarResizer } from "./SidebarResizer";
import SidebarUser from "./SidebarUser";

export default function SideBar() {
  const { t } = useTranslation("modules.sidebar.layout");
  const isOpen = useSidebarStore((s) => s.isOpen);
  const close = useSidebarStore((s) => s.close);
  const openPalette = useCommandPalette((s) => s.setOpen);
  const { mod } = usePlatformModifier();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 animate-in bg-overlay fade-in md:hidden" onClick={close} aria-hidden="true" />
      )}

      <aside
        data-open={isOpen || undefined}
        className="fixed inset-y-0 left-0 z-45 flex w-[min(300px,86vw)] min-w-0 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar shadow-pop transition-transform duration-300 ease-smooth data-open:translate-x-0 md:relative md:z-10 md:h-full md:min-h-0 md:w-auto md:translate-x-0 md:shadow-none md:transition-none"
      >
        <div className="flex h-14 shrink-0 items-center justify-between pr-3 pl-4 sidebar-mini:justify-center sidebar-mini:p-0">
          <Link href="/" aria-label="Kubek" onClick={close} className="rounded-md outline-none focus-visible:outline-2 focus-visible:outline-primary/70">
            <LogoV2 size="lg" className="sidebar-mini:[&>span]:hidden" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openPalette(true)}
            aria-label={t("search")}
            title={t("search")}
            className="ml-auto max-md:mr-1 sidebar-mini:hidden"
          >
            <Search />
            <Kbd className="max-md:hidden">{mod === "⌘" ? "⌘K" : `${mod} K`}</Kbd>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={close} aria-label={t("closeMenu")}>
            <X />
          </Button>
        </div>

        <div className="shrink-0 border-b border-sidebar-border px-3 pb-3 sidebar-mini:px-2 sidebar-mini:pb-2">
          <div className="rounded-lg border border-sidebar-border bg-sidebar-card sidebar-mini:border-0 sidebar-mini:bg-transparent">
            <ServerSwitcher />
            <ServerAddressRow />
            <ServerControls />
          </div>
        </div>

        <Suspense>
          <Navigation />
        </Suspense>

        <div className="grid shrink-0 gap-3 border-t border-sidebar-border p-3 sidebar-mini:p-2">
          <HostMetrics />
          <SidebarUser />
        </div>

        <SidebarResizer />
      </aside>

      <ServersList />
    </>
  );
}
