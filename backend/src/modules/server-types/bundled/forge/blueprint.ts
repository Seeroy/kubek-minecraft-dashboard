import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import {
  argsFileStartup,
  gameVersionVariable,
  installerSteps,
  javaDockerEnv,
  javaVariables,
  minecraftJavaRuntime,
} from "../shared/minecraft-java";

export const forge = {
  manifestVersion: 1,
  id: "com.kubek.forge",
  name: "Forge",
  shortName: "Forge",
  description: "Modded server on the Minecraft Forge loader",
  game: "minecraft",
  author: {
    name: "Kubek Team",
  },
  version: "1.0.0",
  tags: ["minecraft", "java", "forge", "mods"],
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
      TYPE: "FORGE",
      FORGE_VERSION: "{{FORGE_VERSION}}",
    },
  },
  variables: [
    gameVersionVariable,
    {
      key: "FORGE_VERSION",
      label: "Forge version",
      description: "Empty means the recommended build for the game version",
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
    steps: installerSteps("libraries/net/minecraftforge/forge", "FORGE_BUILD"),
  },
  startup: argsFileStartup,
  ...minecraftJavaRuntime,
  features: ["console", "backups", "files", "players"],
} satisfies KubekBlueprintManifest;
