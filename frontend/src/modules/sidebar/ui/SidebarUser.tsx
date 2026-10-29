"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Button } from "@/shared/ui/button";
import { PlayerHead } from "@/shared/ui/player-head";
import { Skeleton } from "@/shared/ui/skeleton";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

export default function SidebarUser() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation("modules.sidebar.profile");

  if (!user) {
    return (
      <div className="flex items-center gap-2 px-2 py-1" aria-busy="true">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-3.5 w-24 sidebar-mini:hidden" />
      </div>
    );
  }

  const role = user.isAdmin ? t("roles.admin") : t("roles.user");

  return (
    <div className="flex items-center gap-2 py-1 pr-1 pl-2 sidebar-mini:flex-col sidebar-mini:p-0" title={`${user.username} · ${role}`}>
      <PlayerHead name={user.skinName || user.username} size={28} className="rounded-md" />
      <div className="min-w-0 flex-1 leading-tight sidebar-mini:hidden">
        <b className="block truncate text-[13px] font-semibold">{user.username}</b>
        <span className="text-[11.5px] text-muted-foreground">{role}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("toggleTheme")}
        title={t("toggleTheme")}
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        {/* Both icons rendered, CSS picks one so markup never depends on the theme */}
        <Sun className="hidden dark:block" />
        <Moon className="dark:hidden" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("logout")}
        title={t("logout")}
        className="sidebar-mini:hidden"
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
      >
        <LogOut />
      </Button>
    </div>
  );
}
