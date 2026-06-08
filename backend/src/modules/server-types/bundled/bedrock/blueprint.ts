import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";

export const bedrock = {
  manifestVersion: 1,
  id: "com.kubek.bedrock",
  name: "Minecraft: Bedrock Edition",
  shortName: "Bedrock",
  description: "Official Bedrock dedicated server",
  game: "minecraft",
  author: {
    name: "Kubek Team",
  },
  version: "1.0.0",
  tags: ["minecraft", "bedrock"],
  engines: {
    kubek: ">=4.0.0",
  },
  platforms: ["win32", "linux"],
  runtime: {
    kind: "native",
  },
  variables: [
    {
      key: "GAME_VERSION",
      label: "Version",
      type: "enum",
      options: {
        from: "versions",
      },
      rules: "required",
      userEditable: true,
    },
  ],
  versions: {
    kind: "resolver",
    module: "versions.ts",
  },
  install: {
    runIn: "host",
    steps: [
      {
        type: "download",
        url: "{{DOWNLOAD_URL}}",
        dest: "bedrock.zip",
        unpack: true,
      },
    ],
  },
  startup: {
    command: "LD_LIBRARY_PATH=. ./bedrock_server",
    commandByPlatform: {
      win32: "bedrock_server.exe",
      linux: "LD_LIBRARY_PATH=. ./bedrock_server",
    },
    stop: {
      type: "signal:SIGINT",
    },
  },
  detection: {
    running: ["Server started", "IPv4 supported"],
    stopping: ["Server stop requested", "Stopping server"],
  },
  query: {
    protocol: "minecraft-bedrock",
    port: {
      fromVariable: "SERVER_PORT",
    },
  },
  ports: [
    {
      key: "game",
      label: "Game",
      default: 19132,
      protocol: "udp",
      env: "SERVER_PORT",
      primary: true,
    },
  ],
  configFiles: [
    {
      path: "server.properties",
      parser: "properties",
      label: "Server Properties",
    },
  ],
  features: ["console", "backups", "files", "players"],
} satisfies KubekBlueprintManifest;
