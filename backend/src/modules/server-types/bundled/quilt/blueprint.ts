import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import {
  eulaAndProperties,
  gameVersionVariable,
  javaDockerEnv,
  javaVariables,
  minecraftJavaRuntime,
} from "../shared/minecraft-java";

export const quilt = {
  manifestVersion: 1,
  id: "com.kubek.quilt",
  name: "Quilt",
  shortName: "Quilt",
  description: "Modded server on the Quilt loader",
  game: "minecraft",
  author: {
    name: "Kubek Team",
  },
  version: "1.0.0",
  tags: ["minecraft", "java", "quilt", "mods"],
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
      ...javaDockerEnv,
      TYPE: "QUILT",
      QUILT_LOADER_VERSION: "{{QUILT_LOADER_VERSION}}",
    },
  },
  variables: [
    gameVersionVariable,
    {
      key: "QUILT_LOADER_VERSION",
      label: "Quilt loader version",
      description: "Empty means the newest stable loader",
      type: "string",
      default: "",
      userEditable: false,
      editableAfterInstall: false,
    },
    ...javaVariables,
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
        dest: "quilt-installer.jar",
      },
      {
        type: "exec",
        command:
          '"{{JAVA_BIN}}" -jar quilt-installer.jar install server {{GAME_VERSION}} {{QUILT_LOADER}} --download-server --install-dir=.',
        timeoutSec: 1800,
      },
      {
        type: "exec",
        command: "rm -f quilt-installer.jar",
        commandByPlatform: {
          win32: "del /q quilt-installer.jar",
        },
      },
      ...eulaAndProperties,
    ],
  },
  startup: {
    command:
      '"{{JAVA_BIN}}" -Dfile.encoding=UTF-8 -Xms{{XMS}}M -Xmx{{XMX}}M {{JVM_ARGS}} -jar quilt-server-launch.jar nogui',
    stop: {
      type: "command",
      value: "stop",
    },
  },
  ...minecraftJavaRuntime,
  // Quilt loads Fabric mods, the catalog is shared
  features: ["console", "backups", "files", "mods:fabric", "players"],
} satisfies KubekBlueprintManifest;
