import { CommandPaletteTrigger } from "@/modules/command-palette";
import Profile from "@/modules/sidebar/ui/Profile";
import ResourcesUsage from "@/modules/sidebar/ui/ResourcesUsage";
import ServerAddressRow from "@/modules/sidebar/ui/ServerAddressRow";
import { cn } from "@/shared/lib/cn";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { Button } from "@/shared/ui/button";
import LogoV2 from "@/shared/ui/logo-v2";
import { ThemeSwitch } from "@/shared/ui/ThemeSwitcher/theme-switcher";
import { X } from "lucide-react";
import Navigation from "./Navigation";
import ServerControls from "./ServerControls";
import ServersList from "./ServersList";

const SideBar = () => {
  const { isOpen, close } = useSidebarStore();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 animate-in bg-background/60 backdrop-blur-sm fade-in md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 h-screen w-full border-r border-sidebar-border/60 bg-sidebar transition-transform duration-300 will-change-transform md:static md:w-auto",
          "transform md:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full w-full flex-col pt-3 md:w-full">
          {/* Logo + command palette launcher */}
          <div className="flex h-16 w-full shrink-0 items-center justify-between px-5">
            <LogoV2 size={"lg"} />
            <div className="flex items-center gap-2">
              <CommandPaletteTrigger variant="icon" />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:hidden"
                onClick={close}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Unified server card: selector → address → status & controls */}
          <div className="shrink-0 animate-in border-b border-sidebar-border/60 px-3 pt-1 pb-3 fade-in slide-in-from-top-2">
            <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40 bg-card/50">
              <ServersList />
              <ServerAddressRow />
              <ServerControls />
            </div>
          </div>

          {/* Navigation */}
          <Navigation />

          {/* Resource Usage */}
          <div className="shrink-0 animate-in space-y-2.5 border-t border-sidebar-border/60 p-3 fade-in slide-in-from-bottom-2">
            <ResourcesUsage />

            <div className="flex items-center justify-between gap-2">
              <Profile />
              <ThemeSwitch />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideBar;
