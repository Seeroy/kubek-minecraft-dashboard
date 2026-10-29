import type { TranslationDictionary } from "../../../locales/types";

export const sharedTranslations: TranslationDictionary = {
  notFound: {
    title: "Page not found",
    description: "There is no such page in the panel, the link may be outdated or mistyped",
    home: "Go to dashboard",
  },
  crash: {
    title: "Something went wrong",
    description: "This section crashed, try opening it again",
    retry: "Try again",
    extension: "Extension error",
  },
  errors: {
    outOfMemory: {
      title: "Server ran out of memory",
      description: "Increase allocated RAM in server settings or optimize memory usage",
      actions: {
        goToServerSettings: "Go to Server Settings",
      },
    },
    portBindFailed: {
      title: "Failed to bind to server port",
      description: "Check if the port is already in use by another application or change the server port",
      actions: {
        goToServerSettings: "Go to Server Settings",
      },
    },
    worldCorruption: {
      title: "World corruption detected",
      description: "Backup your world and try repairing it, or restore from a backup",
      actions: {
        goToBackups: "Go to Backups",
        goToFiles: "Go to Files",
      },
    },
    pluginError: {
      title: "Plugin loading or execution error",
      description: "Check plugin compatibility, update plugins, or remove problematic plugins",
      actions: {
        goToPlugins: "Go to Plugins",
      },
    },
    diskSpace: {
      title: "Insufficient disk space",
      description: "Free up disk space or move the server to a different location",
    },
    networkError: {
      title: "Network connectivity issue",
      description: "Check network configuration and firewall settings",
    },
    configurationError: {
      title: "Configuration file error",
      description: "Check server.properties and other configuration files for syntax errors",
      actions: {
        goToServerSettings: "Go to Server Settings",
      },
    },
    javaVersionIncompatible: {
      title: "Incompatible Java version",
      description: "Update Java to a compatible version for your server core",
      actions: {
        goToServerSettings: "Go to Server Settings",
      },
    },
    filePermissionError: {
      title: "File system permission error",
      description: "Check file permissions and ensure the server has write access to its directory",
    },
    modConflict: {
      title: "Mod compatibility conflict",
      description: "Check mod compatibility, update mods, or remove conflicting mods",
    },
    unknown: {
      title: "Unknown Error",
      description: "An unknown error occurred",
    },
    serverUnreachable: "Server unreachable",
    unexpected: "Unexpected error",
    // API error codes, BAD_REQUEST, NOT_FOUND and CONFLICT keep the server's own message
    codes: {
      UNAUTHORIZED: "Session expired, sign in again",
      FORBIDDEN: "You don't have access to this",
      INTERNAL_ERROR: "Internal server error",
      RATE_LIMITED: "Too many attempts, try again later",
      VALIDATION_ERROR: "Check the entered data",
      TOTP_LOCKED: "Too many attempts, sign in again",
      TOTP_INVALID: "Invalid code",
      TOTP_SETUP_EXPIRED: "Setup has expired, start it again",
      INVALID_PASSWORD: "Invalid password",
      PLAYERS_UNSUPPORTED: "This server type has no player lists",
      PLAYER_NOT_FOUND: "No Minecraft account with this name",
      MOJANG_UNAVAILABLE: "Mojang is unreachable, try again later",
      SERVER_NOT_RUNNING: "The server is not running",
      SERVER_BUSY: "The server is busy with another operation, try again shortly",
      PLAYERS_NEEDS_STOPPED_SERVER: "Stop the server to set this",
      PLAYERS_APPLY_TIMEOUT: "The server did not confirm the change, check the console",
      UNSAFE_LAUNCH_ARGUMENT: (field?: string) => (field ? `Unsafe value in "${field}"` : "A launch argument has an unsafe value"),
      ASSISTANT_NOT_CONFIGURED: "The assistant is not set up",
      ASSISTANT_BUSY: "The assistant is still answering, wait for it to finish",
      ROLE_NAME_TAKEN: "A role with this name already exists",
      ROLE_BUILTIN: "A built-in role can't be renamed or deleted",
      ROLE_UNKNOWN: "One of the picked roles no longer exists, reload the list",
      ACCESS_ESCALATION: "You can't give more access than you have",
    },
  },
  fileSizes: {
    bytes: "B",
    kilobytes: "Kb",
    megabytes: "Mb",
    gigabytes: "Gb",
    unknown: "?",
  },
  socketStatus: {
    disconnected: "disconnected",
    connecting: "connecting",
    connected: "connected",
    error: "error",
  },
  ui: {
    unknown: "Unknown",
  },
};
