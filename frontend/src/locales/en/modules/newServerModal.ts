import type { TranslationDictionary } from "../../../locales/types";

export const newServerModalTranslations: TranslationDictionary = {
  modal: {
    title: "Create a new server",
    close: "Close",
    notifications: {
      catalogError: "Unable to load catalog",
      creationFailed: "Failed to create server",
      creationError: "Something went wrong while creating the server",
      nameTaken: "A server with this name already exists",
    },
  },
  steps: {
    type: {
      label: "Server type",
      hint: "Pick a core, we will figure out the rest",
    },
    basics: {
      label: "Basics",
      hint: "Name, version and Java",
    },
    advanced: {
      label: "Advanced",
      hint: "Memory, launch flags and EULA",
    },
    create: {
      label: "Creation",
      hint: "Creating the server",
    },
  },
  nav: {
    back: "Back",
    next: "Next",
    create: "Create server",
    creating: "Creating…",
    picked: (name: string) => `Selected: ${name}`,
    pickType: "Pick a server type",
    keys: "to continue",
    running: "You can close this window, creation continues in the background",
    another: "Create another",
    done: "Done",
    openConsole: "Open console",
  },
  type: {
    modpack: {
      title: "Have a ready pack?",
      text: "Import a modpack from Modrinth or a .mrpack file, mods install themselves",
      action: "Import modpack",
    },
    search: "Find a server type",
    loading: "Loading server types",
    nothing: "Nothing found",
    nothingHint: (query: string) => `No server types match "${query}"`,
  },
  general: {
    parameters: "Parameters",
    name: {
      label: "Server name",
      placeholder: "My awesome server",
      errors: {
        required: "Server name is required",
        max: "Server name must be less than 50 characters",
        regex: "Server name can only contain latin letters, numbers, spaces, hyphens and underscores",
      },
    },
    port: {
      label: "Server port",
      free: (port: number) => `Next free: ${port}`,
      busy: (name: string) => `Port is already used by "${name}"`,
      errors: {
        range: "Port must be between 1024 and 65535",
      },
    },
  },
  core: {
    version: {
      label: "Core version",
    },
    custom: {
      label: "Core file",
      title: "Drop a .jar file here",
      hint: "Or pick it from your computer",
      choose: "Choose file",
      selected: (name: string) => `Selected file: ${name}`,
      required: "Upload a .jar file",
      invalid: "A .jar file is required",
    },
  },
  java: {
    version: {
      label: "Java version",
      loading: "Loading Java versions…",
      resolving: "Finding a matching Java…",
      mismatch: (core: string, java: number) => `${core} needs Java ${java}`,
      tooOld: "The server will not start on this version",
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
          description: "Use the system Java installation",
        },
      },
      badges: {
        recommended: "Recommended",
        installed: "Installed",
        custom: "Custom",
      },
      manual: {
        option: "Set a path to Java...",
        placeholder: "/path/to/java or install folder",
        apply: "Apply",
        invalid: "No working Java found at this path",
        applied: "Custom Java path applied",
      },
    },
  },
  advanced: {
    memory: {
      label: "Server memory",
      unit: "MB",
      help: "Xms sets the initial heap size, Xmx the maximum",
      free: (size: string) => `Free on the host: ${size}`,
      slider: "Maximum memory",
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
    launch: "Launch options",
    aikar: {
      label: "Aikar flags",
      description: "Tuned G1GC flags for a stable server. Recommended for most servers",
    },
    docker: {
      label: "Run in Docker",
      beta: "Beta",
      description: "Run the server in a Docker container instead of a host process. The choice is fixed once the server is created",
      unavailable: "Docker daemon is unavailable",
    },
    autostart: {
      label: "Start after creation",
      description: "The server starts as soon as everything is ready",
    },
    eula: {
      label: "Accept the Minecraft EULA",
      description: "I agree to the",
      link: "Minecraft EULA",
      required: "A Minecraft server will not start without accepting the EULA",
    },
    folder: {
      label: "Folder in the list",
      none: "No folder",
    },
    startupArguments: {
      label: "Extra arguments",
      placeholder: "-Dproperty=value",
      help: "Memory and Aikar flags are added automatically",
    },
    preview: {
      label: "Final launch arguments",
    },
  },
  progress: {
    stages: {
      java: "Checking Java",
      core: "Preparing core",
      mods: "Downloading mods",
      overrides: "Applying pack settings",
      finalize: "Finalizing",
    },
    pending: "Waiting",
    done: "Done",
    overall: "Overall progress",
    createdTitle: (name: string) => `Server "${name}" created`,
    starting: "The server is starting, follow it in the console",
    ready: "The server is ready to start",
    failedTitle: "Could not create the server",
  },
  blueprint: {
    loadingVersions: "Loading versions",
    selectVersion: "Select a version",
    selectOption: (label: string) => `Select: ${label}`,
    ports: {
      game: "Game port",
      proxy: "Proxy port",
    },
  },
};
