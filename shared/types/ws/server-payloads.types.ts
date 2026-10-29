import type {
  IInstance,
  IInstanceLog,
  InstanceLog_Error,
} from "../server/instance.types";
import type { IServer, ServerStatus } from "../server/server.types";

/** Short server row in server:list */
export type WsServerListItem = Pick<
  IServer,
  "id" | "name" | "status" | "blueprintId" | "variables"
> & {
  folderId: string | null;
};

export interface WsServerStopInfo {
  pid?: number;
  stoppedAt?: string;
  exitCode: number | null;
  crashed: boolean;
}

export interface WsServerCrashInfo {
  exitCode: number | null;
  restartAttempts: number;
}

/** Status change from the instance */
export interface WsServerStatusChange {
  status: ServerStatus;
  timestamp?: string;
  instance?: WsServerStopInfo;
  error?: WsServerCrashInfo;
}

export interface WsServerStatusUpdate {
  serverId: string;
  status: WsServerStatusChange;
  timestamp: string;
}

// Some query adapters don't send counts
export interface WsServerPlayers {
  online?: number;
  max?: number;
  list?: string[];
}

export type WsServerRuntime = NonNullable<IInstance["runtime"]> & {
  playersList?: string[];
};

/** Query result, error is set if the server didn't answer */
export interface WsServerQueryInfo {
  players?: WsServerPlayers;
  version?: string;
  runtime?: WsServerRuntime;
  error?: string;
}

export type WsServerQueryData = WsServerQueryInfo & {
  serverId: string;
  timestamp: string;
};

export type WsServerErrorInfo = Pick<InstanceLog_Error, "errorType" | "severity">;

export type WsServerErrorUpdate = InstanceLog_Error & {
  serverId: string;
  timestamp: string;
};

export interface WsServerErrorResolved {
  serverId: string;
  errorType: string;
  timestamp: string;
}

export interface WsServerFullLog {
  serverId: string;
  data: IInstanceLog[];
  timestamp: string;
}

export interface WsOtpUpdate {
  // Empty in countdown pings, set when the code is created
  code: string;
  expiresAt: number;
  countdown?: number;
  timestamp: string;
}
