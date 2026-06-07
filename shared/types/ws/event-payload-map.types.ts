import { IInstanceLog, InstanceLog_Error } from "../server/instance.types";
import { ITask } from "../task.types";
import { WsServerEventTypes, WsSystemEventTypes } from "./server-events.types";
import { WsMetricsData } from "./system.types";
import { WsTaskEventsTypes } from "./task-events.types";

/**
 * Registry of WebSocket event payload types
 */
export interface WsEventPayloadMap {
  [WsSystemEventTypes.SYSTEM_METRICS]: WsMetricsData;

  [WsTaskEventsTypes.TASK_UPDATE]: ITask;
  [WsTaskEventsTypes.TASK_DONE]: ITask;
  [WsTaskEventsTypes.TASK_FAILED]: ITask;

  [WsServerEventTypes.LOG_UPDATE]: IInstanceLog;
  [WsServerEventTypes.ERROR_UPDATE]: InstanceLog_Error & {
    serverId: string;
    timestamp: string;
  };
  [WsServerEventTypes.FULL_LOG]: {
    serverId: string;
    data: IInstanceLog[];
    timestamp: string;
  };
}
