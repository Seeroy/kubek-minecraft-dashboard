"use client";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { Button } from "@/shared/ui/button";
import { Menu, Terminal } from "lucide-react";

const Header = () => {
  const { name, icon, toggle } = useSidebarStore();

  const Icon = icon ?? Terminal;

  return (
    <aside className="flex h-18 w-full items-center border-b border-sidebar-border bg-sidebar px-4 py-3 transition-colors md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="mr-2 md:hidden"
        onClick={toggle}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Current page name */}
      <div className="flex h-max w-max items-center justify-center gap-2 md:gap-3">
        <div className="aspect-square rounded-lg bg-primary/10 p-2 md:p-2.5">
          <Icon className="text-primary" size={18} />
        </div>
        <span className="truncate text-base font-semibold md:text-lg">
          {name}
        </span>
      </div>

      <div className="grow" />
    </aside>
  );
};

export default Header;
