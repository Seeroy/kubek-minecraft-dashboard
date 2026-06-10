import type { TranslationDictionary } from "../../../locales/types";

export const newServerModalTranslations: TranslationDictionary = {
  modal: {
    title: "Create New Server",
    tabs: {
      core: "Core",
    },
    buttons: {
      cancel: "Cancel",
      create: "Create Server",
      creating: "Creating…",
    },
    notifications: {
      catalogError: "Unable to load catalog",
      creationFailed: "Failed to create server",
      creationError: "Something went wrong while creating the server",
    },
    progress: {
      title: "Creating server",
      runningHint: "You can close this window - creation continues in the background",
      stages: {
        core: "Preparing core",
        java: "Checking Java",
        finalize: "Finalizing",
      },
      buttons: {
        open: "Open server",
        another: "Create another",
        back: "Back",
        close: "Close",
      },
    },
  },
  general: {
    title: "General",
    parameters: "Parameters",
    name: {
      label: "Server Name",
      placeholder: "My Awesome Server",
      errors: {
        required: "Server name is required",
        max: "Server name must be less than 50 characters",
        regex: "Server name can only contain letters, numbers, spaces, hyphens and underscores",
      },
    },
    port: {
      label: "Server Port",
      errors: {
        range: "Port must be between 1024 and 65535",
      },
    },
  },
  core: {
    version: {
      label: "Core Version",
    },
    custom: {
      dropzone: "Drop your `.jar` file here or browse your files",
      selected: ({ name }: { name: string }) => `Selected file: ${name}`,
    },
  },
  java: {
    version: {
      label: "Java Version",
      resolving: "Matching",
      options: {
        "21": {
          label: "Java 21",
          description: "Latest LTS version",
        },
        "17": {
          label: "Java 17",
          description: "Stable LTS version",
        },
        "11": {
          label: "Java 11",
          description: "Compatibility version",
        },
        "8": {
          label: "Java 8",
          description: "Legacy version",
        },
        system: {
          label: "System Java",
          description: "Use system Java installation",
        },
      },
      badges: {
        recommended: "Recommended",
        installed: "Installed",
      },
    },
  },
  advanced: {
    title: "Advanced",
    memory: {
      label: "Server Memory",
      unit: "MB",
      help: "-Xms is the initial heap size, -Xmx is the maximum. Values are in megabytes",
      xms: {
        label: "Initial size (Xms)",
      },
      xmx: {
        label: "Maximum size (Xmx)",
      },
      errors: {
        range: "Memory must be between 256 and 1048576 MB",
        order: "Maximum cannot be lower than the initial size",
      },
    },
    aikar: {
      label: "Aikar's Flags",
      description: "An optimized G1GC flag set for stable server performance. Recommended for most servers",
    },
    docker: {
      label: "Run in Docker",
      beta: "Beta",
      description: "Launch this server in a Docker container instead of a host process. The choice is fixed once the server is created. Beta feature, expect bugs",
      unavailable: "Docker daemon is unavailable",
    },
    startupArguments: {
      label: "Additional Arguments",
      placeholder: "-Dproperty=value",
      help: "Custom JVM arguments. Memory and Aikar flags are added automatically - no need to add them here",
    },
    preview: {
      label: "Effective startup arguments",
    },
  },
  blueprint: {
    loadingTypes: "Loading server types",
    loadingVersions: "Loading versions",
    selectVersion: "Select version",
    selectOption: (label: string) => `Select ${ label.toLowerCase() }`,
    ports: {
      game: "Game port",
      proxy: "Proxy port",
    },
  },
};
