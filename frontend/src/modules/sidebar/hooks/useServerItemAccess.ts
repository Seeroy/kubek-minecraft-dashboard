"use client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { AccessArea } from "@shared/access/areas";
import { useShallow } from "zustand/react/shallow";

/** Which server actions the current user may run on this server */
export function useServerItemAccess(serverId: string | undefined) {
  return useAuthStore(
    useShallow((s) => {
      const on = (area: AccessArea, level: "read" | "write" | "manage") => !!serverId && s.canOnServer(area, level, serverId);
      return {
        power: on(AccessArea.POWER, "write"),
        kill: on(AccessArea.POWER, "manage"),
        rename: on(AccessArea.SETTINGS, "write"),
        exportServer: on(AccessArea.SETTINGS, "manage"),
        remove: on(AccessArea.SETTINGS, "manage"),
        duplicate: s.can(AccessArea.SERVERS, "write"),
        moveToFolder: s.can(AccessArea.SERVERS, "manage"),
      };
    })
  );
}
