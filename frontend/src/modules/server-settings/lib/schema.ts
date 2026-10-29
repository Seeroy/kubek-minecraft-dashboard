import type { Tone } from "@/shared/ui/tone";
import {
  Blocks,
  Bug,
  Cpu,
  Eye,
  Flame,
  Gamepad2,
  Gauge,
  Globe,
  Heart,
  ListChecks,
  Map as MapIcon,
  MessageSquare,
  Network,
  Orbit,
  PawPrint,
  Rabbit,
  Radar,
  Ruler,
  Server,
  Shield,
  ShieldCheck,
  Shuffle,
  Swords,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type SettingsTab = "general" | "java" | "information" | "gameplay" | "world" | "network" | "other" | "velocity";

// Labels and hints are keys under modules.serverSettings
type FieldBase = { key: string; label: string; icon: LucideIcon };

export type PropertyField = FieldBase &
  (
    | { kind: "text" | "number"; hint?: string; placeholder?: string; wide?: boolean }
    | { kind: "switch"; hint?: string; offWarning?: string }
    | { kind: "select"; options: { value: string; label: string }[] }
    // Rendered by a dedicated component next to the generic ones
    | { kind: "motd" | "seed"; hint?: string; placeholder?: string; wide: true }
  );

export interface PropertyGroup {
  id: string;
  tab: Exclude<SettingsTab, "general" | "java" | "other">;
  tone: Tone;
  icon: LucideIcon;
  title: string;
  description: string;
  note?: string;
  fields: PropertyField[];
}

const difficulty = ["peaceful", "easy", "normal", "hard"].map((value) => ({
  value,
  label: `gameplay.gameRules.difficultyOptions.${value}`,
}));
const gamemode = ["survival", "creative", "adventure", "spectator"].map((value) => ({
  value,
  label: `gameplay.gameRules.gamemodeOptions.${value}`,
}));

export const PROPERTY_GROUPS: PropertyGroup[] = [
  {
    id: "server-information",
    tab: "information",
    tone: "blue",
    icon: Server,
    title: "information.serverInformation.title",
    description: "information.serverInformation.description",
    fields: [
      { kind: "motd", key: "motd", icon: MessageSquare, label: "information.serverInformation.motd", placeholder: "information.serverInformation.motdPlaceholder", wide: true },
      { kind: "number", key: "max-players", icon: Users, label: "information.serverInformation.maxPlayers" },
    ],
  },
  {
    id: "security",
    tab: "information",
    tone: "green",
    icon: Shield,
    title: "information.securitySettings.title",
    description: "information.securitySettings.description",
    fields: [
      {
        kind: "switch",
        key: "online-mode", icon: Shield,
        label: "information.securitySettings.onlineMode",
        hint: "information.securitySettings.onlineModeDescription",
        offWarning: "information.securitySettings.onlineModeOffWarning",
      },
      { kind: "switch", key: "white-list", icon: ListChecks, label: "information.securitySettings.whitelist", hint: "information.securitySettings.whitelistDescription" },
    ],
  },
  {
    id: "game-rules",
    tab: "gameplay",
    tone: "green",
    icon: Gamepad2,
    title: "gameplay.gameRules.title",
    description: "gameplay.gameRules.description",
    fields: [
      { kind: "select", key: "difficulty", icon: Swords, label: "gameplay.gameRules.difficulty", options: difficulty },
      { kind: "select", key: "gamemode", icon: Gamepad2, label: "gameplay.gameRules.defaultGamemode", options: gamemode },
    ],
  },
  {
    id: "player-interactions",
    tab: "gameplay",
    tone: "blue",
    icon: Users,
    title: "gameplay.playerInteractions.title",
    description: "gameplay.playerInteractions.description",
    fields: [
      { kind: "switch", key: "pvp", icon: Swords, label: "gameplay.playerInteractions.pvp", hint: "gameplay.playerInteractions.pvpDescription" },
      { kind: "switch", key: "allow-flight", icon: Zap, label: "gameplay.playerInteractions.allowFlight", hint: "gameplay.playerInteractions.allowFlightDescription" },
    ],
  },
  {
    id: "world-rules",
    tab: "gameplay",
    tone: "amber",
    icon: Globe,
    title: "gameplay.worldSettings.title",
    description: "gameplay.worldSettings.description",
    fields: [
      { kind: "switch", key: "hardcore", icon: Heart, label: "gameplay.worldSettings.hardcoreMode", hint: "gameplay.worldSettings.hardcoreModeDescription" },
      { kind: "number", key: "spawn-protection", icon: ShieldCheck, label: "gameplay.worldSettings.spawnProtectionRadius", hint: "gameplay.worldSettings.spawnProtectionRadiusHelp" },
    ],
  },
  {
    id: "world-generation",
    tab: "world",
    tone: "green",
    icon: MapIcon,
    title: "world.worldGeneration.title",
    description: "world.worldGeneration.description",
    fields: [
      { kind: "seed", key: "level-seed", icon: Shuffle, label: "world.worldGeneration.worldSeed", placeholder: "world.worldGeneration.worldSeedPlaceholder", wide: true },
      { kind: "number", key: "max-world-size", icon: Ruler, label: "world.worldGeneration.maxWorldSize", hint: "world.worldGeneration.maxWorldSizeHelp" },
      { kind: "switch", key: "generate-structures", icon: Blocks, label: "world.worldGeneration.generateStructures", hint: "world.worldGeneration.generateStructuresDescription" },
    ],
  },
  {
    id: "world-performance",
    tab: "world",
    tone: "purple",
    icon: Gauge,
    title: "world.performanceSettings.title",
    description: "world.performanceSettings.description",
    fields: [
      { kind: "number", key: "view-distance", icon: Eye, label: "world.performanceSettings.viewDistance", hint: "world.performanceSettings.viewDistanceHelp" },
      { kind: "number", key: "simulation-distance", icon: Cpu, label: "world.performanceSettings.simulationDistance", hint: "world.performanceSettings.simulationDistanceHelp" },
    ],
  },
  {
    id: "dimensions",
    tab: "world",
    tone: "orange",
    icon: Orbit,
    title: "world.dimensionSettings.title",
    description: "world.dimensionSettings.description",
    fields: [{ kind: "switch", key: "allow-nether", icon: Flame, label: "world.dimensionSettings.allowNether", hint: "world.dimensionSettings.allowNetherDescription" }],
  },
  {
    id: "spawning",
    tab: "world",
    tone: "pink",
    icon: PawPrint,
    title: "world.spawnSettings.title",
    description: "world.spawnSettings.description",
    fields: [
      { kind: "switch", key: "spawn-animals", icon: Rabbit, label: "world.spawnSettings.spawnAnimals", hint: "world.spawnSettings.spawnAnimalsDescription" },
      { kind: "switch", key: "spawn-monsters", icon: Bug, label: "world.spawnSettings.spawnMonsters", hint: "world.spawnSettings.spawnMonstersDescription" },
      { kind: "switch", key: "spawn-npcs", icon: Users, label: "world.spawnSettings.spawnNpcs", hint: "world.spawnSettings.spawnNpcsDescription" },
    ],
  },
  {
    id: "connection",
    tab: "network",
    tone: "blue",
    icon: Network,
    title: "network.connectionSettings.title",
    description: "network.connectionSettings.description",
    note: "network.networkConfiguration.importantNoticeText",
    fields: [
      { kind: "number", key: "server-port", icon: Network, label: "network.connectionSettings.serverPort", hint: "network.connectionSettings.serverPortDefault" },
      { kind: "number", key: "query.port", icon: Radar, label: "network.connectionSettings.queryPort", hint: "network.connectionSettings.queryPortDefault" },
    ],
  },
];

/** server.properties key to the tab that edits it, anything else lives in "other" */
export const PROPERTY_TAB: Record<string, SettingsTab> = Object.fromEntries(
  PROPERTY_GROUPS.flatMap((group) => group.fields.map((field) => [field.key, group.tab]))
);
