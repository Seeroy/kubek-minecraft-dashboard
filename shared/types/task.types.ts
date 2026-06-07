export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum TaskType {
  SERVER_CREATE = "server.create",
  SERVER_DUPLICATE = "server.duplicate",
  SERVER_IMPORT = "server.import",
  SERVER_START = "server.start",
  SERVER_STOP = "server.stop",
  SERVER_RESTART = "server.restart",
  PLUGIN_INSTALL = "plugin.install",
  PLUGIN_UPDATE = "plugin.update",
  PLUGIN_REMOVE = "plugin.remove",
  MOD_INSTALL = "mod.install",
  MOD_UPDATE = "mod.update",
  MOD_REMOVE = "mod.remove",
  BACKUP_CREATE = "backup.create",
  BACKUP_RESTORE = "backup.restore",
  BACKUP_DELETE = "backup.delete",
  JAVA_INSTALL = "java.install",
  FILES_DELETE = "files.delete",
  FILES_ARCHIVE = "files.archive",
  FILES_EXTRACT = "files.extract",
}

export enum TaskSteps {
  SEARCHING_CORE = "searchingCore",
  CHECKING_JAVA = "checkingJava",
  DOWNLOADING_JAVA = "downloadingJava",
  UNPACKING_JAVA = "unpackingJava",
  DOWNLOADING_CORE = "downloadingCore",
  CREATING_BAT = "creatingBat",
  COMPLETION = "completion",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface TaskMeta {
  serverId?: string;
  serverName?: string;
  pluginId?: string;
  pluginName?: string;
  backupId?: string;
  javaVersion?: string;
}

export interface ITask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number; // 0–100
  step?: TaskSteps;
  message?: string;
  meta?: TaskMeta;
  result?: any;
  error?: { code: string; message: string };
  createdAt: number;
  updatedAt: number;
  ownerId?: string;
}
