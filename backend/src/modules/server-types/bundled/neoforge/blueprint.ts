import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import {
  argsFileStartup,
  gameVersionVariable,
  installerSteps,
  javaDockerEnv,
  javaVariables,
  minecraftJavaRuntime,
} from "../shared/minecraft-java";

export const neoforge = {
  manifestVersion: 1,
  id: "com.kubek.neoforge",
  name: "NeoForge",
  shortName: "NeoForge",
  description: "Modded server on the NeoForge loader",
  game: "minecraft",
  author: {
    name: "Kubek Team",
  },
  version: "1.0.0",
  tags: ["minecraft", "java", "neoforge", "mods"],
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
      TYPE: "NEOFORGE",
      NEOFORGE_VERSION: "{{NEOFORGE_VERSION}}",
    },
  },
  variables: [
    gameVersionVariable,
    {
      key: "NEOFORGE_VERSION",
      label: "NeoForge version",
      description: "Empty means the newest stable build for the game version",
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
    steps: installerSteps("libraries/net/neoforged/neoforge", "NEOFORGE_BUILD"),
  },
  startup: argsFileStartup,
  ...minecraftJavaRuntime,
  features: ["console", "backups", "files", "players"],
} satisfies KubekBlueprintManifest;
