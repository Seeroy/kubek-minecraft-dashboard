import type { Server } from "@/modules/server";
import type { IServerFolder } from "@shared/types/server/folder.types";
import { useMemo } from "react";

export interface ServerGroup {
  folder: IServerFolder | null;
  servers: Server[];
}

export function useGroupedServers(
  servers: Server[],
  folders: IServerFolder[] | undefined
): ServerGroup[] {
  return useMemo(() => {
    const byFolder: Record<string, Server[]> = {};
    const noFolder: Server[] = [];
    for (const s of servers) {
      const fid = s.folderId ?? null;
      if (fid == null) noFolder.push(s);
      else (byFolder[fid] ??= []).push(s);
    }

    const sortedFolders = (folders ?? [])
      .slice()
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      );

    const groups: ServerGroup[] = sortedFolders.map((f) => ({
      folder: f,
      servers: byFolder[f.id] ?? [],
    }));
    groups.push({ folder: null, servers: noFolder });
    return groups;
  }, [servers, folders]);
}
