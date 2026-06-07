import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";

export const folia = {
  manifestVersion: 1,
  id: "com.kubek.folia",
  name: "Folia",
  shortName: "Folia",
  description: "Regionised multithreaded Paper fork",
  game: "minecraft",
  author: {
    name: "Kubek Team",
  },
  version: "1.0.0",
  tags: ["minecraft", "java", "folia"],
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
      default: 2048,
      rules: "required|min:512",
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
        url: "https://fill.papermc.io/v3/projects/folia",
      },
      select: "$.versions[*]",
      sort: "semver-desc",
    },
    resolveDownload: {
      request: {
        url: "https://fill.papermc.io/v3/projects/folia/versions/{{GAME_VERSION}}/builds/latest",
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
      {
        type: "writeFile",
        path: "eula.txt",
        content: "eula=true",
      },
      {
        type: "writeFile",
        path: "server.properties",
        content:
          "server-port={{SERVER_PORT}}\nquery.port={{SERVER_PORT}}\nenable-query=true\nonline-mode=false\nmotd=§f{{SERVER_NAME}}",
      },
    ],
  },
  startup: {
    command:
      '"{{JAVA_BIN}}" -Dfile.encoding=UTF-8 -Xms{{XMS}}M -Xmx{{XMX}}M {{JVM_ARGS}} -jar server.jar nogui',
    stop: {
      type: "command",
      value: "stop",
    },
  },
  detection: {
    starting: ["Starting minecraft server", "Preparing spawn area"],
    running: ["Done \\(.*\\)! For help"],
    stopping: ["Stopping (the )?server"],
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
      label: "Game",
      default: 25565,
      protocol: "tcp",
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
  features: ["console", "backups", "files", "plugins:modrinth", "players"],
} satisfies KubekBlueprintManifest;
