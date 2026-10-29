export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum TaskType {
  SERVER_CREATE = "server.create",
  SERVER_CHANGE_CORE = "server.changeCore",
  SERVER_DUPLICATE = "server.duplicate",
  SERVER_IMPORT = "server.import",
  SERVER_EXPORT = "server.export",
  SERVER_CREATE_MODPACK = "server.create_modpack",
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
  BACKUP_UPLOAD = "backup.upload",
  JAVA_INSTALL = "java.install",
  FILES_DELETE = "files.delete",
  FILES_ARCHIVE = "files.archive",
  FILES_EXTRACT = "files.extract",
  NETWORK_CREATE = "network.create",
  NETWORK_UPDATE = "network.update",
  MODPACK_INSPECT = "modpack.inspect",
}

export enum TaskSteps {
  SEARCHING_CORE = "searchingCore",
  CHECKING_JAVA = "checkingJava",
  DOWNLOADING_JAVA = "downloadingJava",
  UNPACKING_JAVA = "unpackingJava",
  DOWNLOADING_CORE = "downloadingCore",
  PULLING_IMAGE = "pullingImage",
  CREATING_BAT = "creatingBat",
  DOWNLOADING_MODS = "downloadingMods",
  APPLYING_OVERRIDES = "applyingOverrides",
  REGISTERING_CONTENT = "registeringContent",
  COMPLETION = "completion",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface TaskMeta {
  serverId?: string;
  serverName?: string;
  pluginId?: string;
  pluginName?: string;
  /** Version number of the content being installed */
  versionName?: string;
  backupId?: string;
  javaVersion?: string;
}

export type TaskStageStatus = "pending" | "running" | "done" | "failed";

/** One named part of a long task, the client lists them with their own progress */
export interface TaskStage {
  key: string;
  /** What the stage does, the client turns it into text */
  kind: string;
  /** Server or file the stage works on */
  name?: string;
  status: TaskStageStatus;
  progress?: number;
  step?: TaskSteps;
  bytes?: { done: number; total: number };
}

export interface ITask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number; // 0-100
  step?: TaskSteps;
  message?: string;
  meta?: TaskMeta;
  result?: any;
  stages?: TaskStage[];
  error?: { code: string; message: string };
  createdAt: number;
  updatedAt: number;
  ownerId?: string;
}
