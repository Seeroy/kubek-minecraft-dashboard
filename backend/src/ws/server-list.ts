import type { IServer } from "@shared/types/server/server.types";
import type { WsServerListItem } from "@shared/types/ws/server-payloads.types";

/** Short row for server:list, the full server comes over HTTP */
export function toServerListItem(server: IServer): WsServerListItem {
  return {
    id: server.id,
    name: server.name,
    status: server.status,
    folderId: server.folderId ?? null,
    blueprintId: server.blueprintId,
    variables: server.variables,
  };
}
