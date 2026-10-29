import type { INotification } from "../notification.types";
import {
  WsAssistantDelta,
  WsAssistantDone,
  WsAssistantError,
  WsAssistantEventTypes,
  WsAssistantMessage,
  WsAssistantTool,
} from "./assistant-events.types";
import { IInstanceLog } from "../server/instance.types";
import { ITask } from "../task.types";
import { WsNotificationEventTypes } from "./notification-events.types";
import {
  WsServerEventTypes,
  WsSystemEventTypes,
  WsTelegramEventTypes,
} from "./server-events.types";
import type {
  WsOtpUpdate,
  WsServerErrorResolved,
  WsServerErrorUpdate,
  WsServerFullLog,
  WsServerListItem,
  WsServerQueryData,
  WsServerStatusUpdate,
} from "./server-payloads.types";
import { WsMetricsData } from "./system.types";
import { WsTaskEventsTypes } from "./task-events.types";
import { WsUserEventTypes } from "./user-events.types";

/**
 * Registry of server to client WebSocket events and their payloads
 */
export interface WsEventPayloadMap {
  [WsUserEventTypes.AUTH_FAILED]: string;

  [WsSystemEventTypes.SYSTEM_METRICS]: WsMetricsData;

  [WsTaskEventsTypes.TASK_UPDATE]: ITask;
  [WsTaskEventsTypes.TASK_DONE]: ITask;
  [WsTaskEventsTypes.TASK_FAILED]: ITask;

  [WsNotificationEventTypes.NEW]: INotification;

  [WsAssistantEventTypes.DELTA]: WsAssistantDelta;
  [WsAssistantEventTypes.MESSAGE]: WsAssistantMessage;
  [WsAssistantEventTypes.TOOL]: WsAssistantTool;
  [WsAssistantEventTypes.CONFIRM]: WsAssistantTool;
  [WsAssistantEventTypes.DONE]: WsAssistantDone;
  [WsAssistantEventTypes.ERROR]: WsAssistantError;

  [WsServerEventTypes.LIST]: WsServerListItem[];
  [WsServerEventTypes.STATUS_UPDATE]: WsServerStatusUpdate;
  [WsServerEventTypes.QUERY_DATA]: WsServerQueryData;
  [WsServerEventTypes.LOG_UPDATE]: IInstanceLog;
  [WsServerEventTypes.ERROR_UPDATE]: WsServerErrorUpdate;
  [WsServerEventTypes.ERROR_RESOLVED]: WsServerErrorResolved;
  [WsServerEventTypes.FULL_LOG]: WsServerFullLog;

  [WsTelegramEventTypes.OTP_UPDATE]: WsOtpUpdate;
}

export type WsEvent = keyof WsEventPayloadMap;
