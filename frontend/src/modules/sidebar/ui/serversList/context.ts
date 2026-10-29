"use client";

import type { CreationStatusView } from "@/modules/server/modals/CreateServerModal/stages";
import type { IServerFolder } from "@shared/types/server/folder.types";
import { createContext, useContext } from "react";

export interface ServersListActions {
  select: (id: string) => void;
  duplicate: (id: string) => void;
  rename: (id: string) => void;
  exportServer: (id: string) => void;
  remove: (id: string) => void;
  renameFolder: (folder: IServerFolder) => void;
}

interface ServersListContextValue {
  actions: ServersListActions;
  creatingById: Map<string, CreationStatusView>;
  selectedServerId: string | undefined;
}

export const ServersListContext = createContext<ServersListContextValue | null>(null);

export function useServersList() {
  const value = useContext(ServersListContext);
  if (!value) throw new Error("useServersList must be used inside ServersList");
  return value;
}
