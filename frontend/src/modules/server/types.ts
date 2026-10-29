import type { IServer, ServerStatus } from "@shared/types/server/server.types";
import type {
  WsServerListItem,
  WsServerPlayers,
  WsServerRuntime,
} from "@shared/types/ws/server-payloads.types";

/** Server in the list, socket rows have fewer fields than HTTP ones */
export type Server = WsServerListItem &
  Partial<Omit<IServer, keyof WsServerListItem>>;

/** Live data from status_update and query_data */
export interface ServerStatusData {
  serverId: string;
  // Can be missing if only query data came so far
  status?: ServerStatus;
  players?: WsServerPlayers;
  runtime?: WsServerRuntime;
  version?: string;
  timestamp?: string;
}
