import { type IServer, ServerStatus } from "./server.types";

export interface IInstance {
  serverId: string;
  port?: number;
  queryPort?: number;
  pid?: number;
  startedAt?: string;
  stoppedAt?: string;
  runtime?: {
    memoryUsedMb?: number;
    maxMemoryMb?: number;
    cpuPercent?: number;
    playersOnline?: number;
    gameVersion?: string;
    startedAt?: string;
  };
}

export interface JavaInstancePrepareProps {
  server: IServer;
  port: number;
}

//
// LOGS DATA
//
export interface InstanceLog_UserInput {
  type: "user_input";
  username: string;
  id: string;
  command: string;
}

export interface InstanceLog_StatusChange {
  type: "status_change";
  status: ServerStatus;
}

export interface InstanceLog_OnStop {
  type: "stop";
  exitCode: number;
  causedBy: "killed" | "crashed";
}

export interface InstanceLog_RestartFailed {
  type: "restart_failed";
  attempts: number;
}

export interface InstanceLog_BotControl {
  type: "bot_control";
  action: "start" | "stop" | "restart";
  userId: string;
  username: string;
  telegramId: number;
}

export interface InstanceLog_Error {
  type: "error";
  errorType: string;
  severity: string;
}

export type ServerDiagnosticSeverity = "critical" | "high" | "medium" | "low";

export interface IServerDiagnostic {
  errorType: string;
  severity: ServerDiagnosticSeverity;
  timestamp: string;
}

export interface IInstanceLog {
  serverId?: string;
  type: "stdin" | "stdout" | "stderr" | "kubek" | "telegram";
  line?: string;
  timestamp: string;

  data?:
    | InstanceLog_UserInput
    | InstanceLog_StatusChange
    | InstanceLog_OnStop
    | InstanceLog_RestartFailed
    | InstanceLog_BotControl;
}
