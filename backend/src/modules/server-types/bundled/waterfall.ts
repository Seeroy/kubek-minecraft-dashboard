import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";

export const waterfall = {
  manifestVersion: 1,
  id: "com.kubek.waterfall",
  name: "Waterfall",
  shortName: "Waterfall",
  description: "BungeeCord proxy fork",
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
  dockerProfile: {
    image: "itzg/minecraft-server:{{JAVA_IMAGE_TAG}}",
    stdinOpen: true,
    stop: {
      type: "signal:SIGTERM",
    },
    env: {
      EULA: "TRUE",
      TYPE: "WATERFALL",
      VERSION: "{{GAME_VERSION}}",
      MAX_MEMORY: "{{XMX}}M",
      INIT_MEMORY: "{{XMS}}M",
      JVM_OPTS: "{{JVM_ARGS}}",
      SERVER_PORT: "{{SERVER_PORT}}",
      OVERRIDE_SERVER_PROPERTIES: "false",
      PUID: "{{HOST_UID}}",
      PGID: "{{HOST_GID}}",
    },
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
      default: 21,
      userEditable: true,
    },
  ],
  versions: {
    kind: "http",
    list: {
      request: {
        url: "https://fill.papermc.io/v3/projects/waterfall",
      },
      select: "$.versions[*]",
      sort: "semver-desc",
    },
    resolveDownload: {
      request: {
        url: "https://fill.papermc.io/v3/projects/waterfall/versions/{{GAME_VERSION}}/builds/latest",
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
      type: "command",
      value: "end",
    },
  },
  detection: {
    running: ["Listening on", "Enabled .* plugins"],
    stopping: ["Closing pending connections", "Saving"],
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
      path: "config.yml",
      parser: "yaml",
      label: "Proxy Config",
    },
  ],
  features: ["console", "backups", "files", "players"],
} satisfies KubekBlueprintManifest;
