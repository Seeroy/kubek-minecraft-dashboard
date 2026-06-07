export enum WsServerEventTypes {
  STATUS_UPDATE = "server:status_update",
  QUERY_DATA = "server:query_data",
  LOG_UPDATE = "server:log_update",
  ERROR_UPDATE = "server:error_update",
  ERROR_RESOLVED = "server:error_resolved",
  FULL_LOG = "server:fullLog",
  STARTED = "server:started",
  STOPPED = "server:stopped",
  CRASHED = "server:crashed",
  LIST = "server:list",
  SUBMIT_COMMAND = "server:client:submit_cmd",
  REQUEST_FULL_LOG = `server:client:request_full_log`,
}

export enum WsTelegramEventTypes {
  OTP_UPDATE = "telegram:otp_update",
}

export enum WsInstancesEventTypes {
  LIST = "instances:list",
}

export enum WsSystemEventTypes {
  SYSTEM_METRICS = "system:metrics",
  SYSTEM_MONITORING_UPDATE = "system-monitoring:update",
  UPDATE_NOTIFICATION = "update:notification",
}
