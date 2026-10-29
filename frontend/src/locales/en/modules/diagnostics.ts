export const diagnosticsTranslations = {
  title: "Diagnostics",
  empty: "No issues detected",
  restartFailed: "Failed to restart server",
  explainPrompt: (title: string, type: string) =>
    `The panel detected a problem on this server: "${title}" (${type}). Look at the console and diagnostics, explain the cause and how to fix it.`,
  severity: {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  },
  fixes: {
    openServerSettings: "Server settings",
    openJava: "Java manager",
    openBackups: "Backups",
    openFiles: "Files",
    openPlugins: "Plugins",
    restart: "Restart",
  },
  restartConfirm: {
    title: "Restart server?",
    description: "The server will be stopped and started again, players will be disconnected",
    confirm: "Restart",
    cancel: "Cancel",
  },
  errors: {
    unknown: {
      title: "Unknown error",
      description: "An unknown error occurred",
    },
    out_of_memory: {
      title: "Server ran out of memory",
      description: "Increase allocated RAM in server settings or optimize memory usage",
    },
    port_bind_failed: {
      title: "Failed to bind to server port",
      description: "Check if the port is already in use by another application, or change the server port",
    },
    port_invalid: {
      title: "Invalid server port",
      description: "The port must be between 1 and 65535, fix it in the server settings",
    },
    world_corruption: {
      title: "World corruption detected",
      description: "Back up your world and try repairing it, or restore from a backup",
    },
    plugin_error: {
      title: "Plugin loading or execution error",
      description: "Check plugin compatibility, update plugins, or remove problematic ones",
    },
    disk_space: {
      title: "Insufficient disk space",
      description: "Free up disk space or move the server to a different location",
    },
    network_error: {
      title: "Network connectivity issue",
      description: "Check network configuration and firewall settings",
    },
    configuration_error: {
      title: "Configuration file error",
      description: "Check server.properties and other configuration files for syntax errors",
    },
    java_version_incompatible: {
      title: "Incompatible Java version",
      description: "Update Java to a compatible version for your server core",
    },
    file_permission_error: {
      title: "File system permission error",
      description: "Check file permissions and ensure the server has write access to its directory",
    },
    mod_conflict: {
      title: "Mod compatibility conflict",
      description: "Check mod compatibility, update mods, or remove conflicting ones",
    },
    server_unresponsive: {
      title: "Server is not responding",
      description: "The process is alive but the server stopped responding to queries - try restarting it",
    },
  },
};
