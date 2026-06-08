import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";

export const velocity = {
  manifestVersion: 1,
  id: "com.kubek.velocity",
  name: "Velocity",
  shortName: "Velocity",
  description: "Modern, high performance Minecraft proxy",
  game: "minecraft",
  author: {
    name: "Kubek Team",
  },
  version: "1.0.0",
  tags: ["minecraft", "java", "proxy"],
  engines: {
    kubek: ">=4.0.0",
  },
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
    {
      key: "XMX",
      label: "Memory (MB)",
      type: "number",
      default: 512,
      rules: "required|min:256",
      userEditable: true,
    },
    {
      key: "XMS",
      label: "Initial Memory (MB)",
      type: "number",
      default: 512,
      rules: "required|min:256",
      userEditable: true,
    },
    {
      key: "JVM_ARGS",
      label: "JVM Arguments",
      type: "string",
      default: "",
      userEditable: true,
    },
    {
      key: "JAVA_VERSION",
      label: "Java",
      type: "number",
      default: 25,
      userEditable: true,
    },
  ],
  versions: {
    kind: "http",
    list: {
      request: {
        url: "https://fill.papermc.io/v3/projects/velocity",
      },
      select: "$.versions[*]",
      sort: "semver-desc",
    },
    resolveDownload: {
      request: {
        url: "https://fill.papermc.io/v3/projects/velocity/versions/{{GAME_VERSION}}/builds/latest",
      },
      select: "$.downloads.server:default.url",
    },
  },
  install: {
    runIn: "host",
    steps: [
      {
        type: "download",
        url: "{{DOWNLOAD_URL}}",
        dest: "server.jar",
      },
    ],
  },
  startup: {
    command:
      '"{{JAVA_BIN}}" -Dfile.encoding=UTF-8 -Xms{{XMS}}M -Xmx{{XMX}}M {{JVM_ARGS}} -jar server.jar',
    stop: {
      type: "signal:SIGINT",
    },
  },
  detection: {
    running: ["Done \\(.*\\)!", "Listening on"],
    stopping: ["Shutting down", "Closing endpoint"],
  },
  query: {
    protocol: "minecraft-java",
    port: {
      fromVariable: "SERVER_PORT",
    },
  },
  ports: [
    {
      key: "game",
      label: "Proxy",
      default: 25577,
      protocol: "tcp",
      env: "SERVER_PORT",
      primary: true,
    },
  ],
  configFiles: [
    {
      path: "velocity.toml",
      parser: "toml",
      label: "Velocity Config",
    },
  ],
  features: ["console", "backups", "files", "players"],
} satisfies KubekBlueprintManifest;
