"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Skeleton } from "@/shared/ui/skeleton";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

const Profile = () => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { t } = useTranslation("modules.header");

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!user) {
    return (
      <div
        className="flex w-full items-center gap-2 rounded-full px-2 py-0.5"
        aria-busy="true"
      >
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-col gap-1 leading-tight">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  const getInitials = (username: string) => {
    return username
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-full px-2 py-0.5 transition-colors outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/40">
        <Avatar className="h-7 w-7">
          <AvatarImage src="" alt={user.username} />
          <AvatarFallback className="bg-primary/15 text-[10px] font-medium text-primary">
            {getInitials(user.username)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-md max-w-[120px] truncate font-medium">
            {user.username}
          </span>
          <span
            className={cn(
              "max-w-[120px] truncate text-[11px]",
              user.isAdmin ? "text-primary" : "text-muted-foreground"
            )}
          >
            {user.isAdmin ? t("profile.roles.admin") : t("profile.roles.user")}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="mb-2 w-[305px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium">
                {user.username}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.isAdmin
                  ? t("profile.roles.admin")
                  : t("profile.roles.user")}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("profile.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Profile;
