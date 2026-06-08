import type { TranslationDictionary } from "../../../locales/types";

export const sharedTranslations: TranslationDictionary = {
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