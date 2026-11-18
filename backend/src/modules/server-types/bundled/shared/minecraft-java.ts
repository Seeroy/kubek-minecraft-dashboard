import type {
  BlueprintVariable,
  KubekBlueprintManifest,
} from "@kubekpanel/blueprint-sdk";

// Common parts of the modded Java cores

export const gameVersionVariable: BlueprintVariable = {
  key: "GAME_VERSION",
  label: "Version",
  type: "enum",
  options: { from: "versions" },
  rules: "required",
  userEditable: true,
};

export const javaVariables: BlueprintVariable[] = [
  {
    key: "XMX",
    label: "Memory (MB)",
    type: "number",
    default: 4096,
    rules: "required|min:1024",
    userEditable: true,
  },
  {
    key: "XMS",
    label: "Initial Memory (MB)",
    type: "number",
    default: 1024,
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
];

export const eulaAndProperties: KubekBlueprintManifest["install"]["steps"] = [
  { type: "writeFile", path: "eula.txt", content: "eula=true" },
  {
    type: "writeFile",
    path: "server.properties",
    content:
      "server-port={{SERVER_PORT}}\nquery.port={{SERVER_PORT}}\nenable-query=true\nonline-mode=false\nmotd=§f{{SERVER_NAME}}",
  },
];

export const javaDockerEnv = {
  EULA: "TRUE",
  VERSION: "{{GAME_VERSION}}",
  MAX_MEMORY: "{{XMX}}M",
  INIT_MEMORY: "{{XMS}}M",
  JVM_OPTS: "{{JVM_ARGS}}",
  SERVER_PORT: "{{SERVER_PORT}}",
  OVERRIDE_SERVER_PROPERTIES: "false",
  ENABLE_RCON: "TRUE",
  RCON_PASSWORD: "kubek",
  UID: "{{HOST_UID}}",
  GID: "{{HOST_GID}}",
};

export const minecraftJavaRuntime = {
  detection: {
    starting: ["Starting minecraft server", "Preparing spawn area"],
    running: ["Done \\(.*\\)! For help"],
    stopping: ["Stopping (the )?server"],
  },
  query: {
    protocol: "minecraft-java",
    port: { fromVariable: "SERVER_PORT" },
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
} satisfies Pick<
  KubekBlueprintManifest,
  "detection" | "query" | "ports" | "configFiles"
>;

// kubek_args.txt comes from installerSteps
export const argsFileStartup: KubekBlueprintManifest["startup"] = {
  command:
    '"{{JAVA_BIN}}" -Dfile.encoding=UTF-8 -Xms{{XMS}}M -Xmx{{XMX}}M {{JVM_ARGS}} @kubek_args.txt nogui',
  stop: { type: "command", value: "stop" },
};

// Copies the args file to a fixed name, so startup doesn't need the loader version
export function installerSteps(
  libraryDir: string,
  buildVar: string,
): KubekBlueprintManifest["install"]["steps"] {
  const unixDir = `${libraryDir}/{{${buildVar}}}`;
  const winDir = unixDir.replaceAll("/", "\\");
  return [
    { type: "download", url: "{{DOWNLOAD_URL}}", dest: "installer.jar" },
    {
      type: "exec",
      command: '"{{JAVA_BIN}}" -jar installer.jar --installServer',
      timeoutSec: 1800,
    },
    {
      type: "exec",
      command: `cp ${unixDir}/unix_args.txt kubek_args.txt && rm -f installer.jar installer.jar.log`,
      commandByPlatform: {
        // del fails when there's no log, that's fine
        win32: `copy /y ${winDir}\\win_args.txt kubek_args.txt && (del /q installer.jar installer.jar.log 2>nul || exit /b 0)`,
      },
    },
    ...eulaAndProperties,
  ];
}
