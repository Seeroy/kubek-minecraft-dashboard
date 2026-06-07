"use client";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { Button } from "@/shared/ui/button";
import LogoV2 from "@/shared/ui/logo-v2";
import { Menu } from "lucide-react";

const MobileHeader = () => {
  const toggle = useSidebarStore((s) => s.toggle);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border/60 bg-sidebar/60 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={toggle}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <LogoV2 size="md" />
    </header>
  );
};

export default MobileHeader;
