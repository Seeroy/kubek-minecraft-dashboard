// Kubek Companion: the server plugin and its protocol, see kubek-companion/PROTOCOL.md

export type CompanionTpsSource = "PAPER" | "SPIGOT" | "FOLIA" | "COUNTER";
export type CompanionMsptSource = "EVENTS" | "AVERAGE" | "SAMPLED" | "NONE";

export interface CompanionCaps {
  tps: CompanionTpsSource;
  mspt: CompanionMsptSource;
  folia: boolean;
  ping: boolean;
  tileCounters: boolean;
  bossBar: boolean;
}

export interface CompanionPluginSettings {
  intervalSec: number;
  coords: boolean;
  chat: boolean;
}

export interface CompanionHello {
  protocol: number;
  plugin: string;
  server: {
    name: string;
    version: string;
    bukkitVersion: string;
    onlineMode: boolean;
  };
  java: { version: string; vendor: string; vm: string };
  caps: CompanionCaps;
  settings: CompanionPluginSettings;
}

export interface CompanionMspt {
  /** events, average, sampled or region */
  source: string;
  avg: number;
  p50?: number;
  p95?: number;
  p99?: number;
  max?: number;
  ticks?: number;
  /** Busy share of the main thread, sampled source only */
  load?: number;
  /** Folia, player readings behind the worst region average */
  samples?: number;
}

export interface CompanionGc {
  count: number;
  timeMs: number;
  pauses?: number;
  pauseMs?: number;
  maxPauseMs?: number;
}

export interface CompanionJvm {
  heapUsed: number;
  heapCommitted: number;
  heapMax: number;
  nonHeapUsed: number;
  threads: number;
  daemonThreads: number;
  uptime: number;
  gc: CompanionGc;
}

export interface CompanionWorld {
  name: string;
  env: string;
  players: number | null;
  chunks: number | null;
  entities: number | null;
  tiles: number | null;
  tickingTiles: number | null;
}

export interface CompanionPlayer {
  uuid: string;
  name: string;
  world: string;
  gamemode: string;
  ping: number | null;
  /** Join time, ms epoch */
  since: number | null;
  x?: number;
  y?: number;
  z?: number;
}

export interface CompanionStats {
  ts: number;
  intervalSec: number;
  /** 1m, 5m, 15m */
  tps: number[] | null;
  tpsSource: CompanionTpsSource;
  mspt: CompanionMspt | null;
  jvm: CompanionJvm;
  online: number;
  maxPlayers: number;
  worlds: CompanionWorld[];
  players: CompanionPlayer[];
}

export type CompanionEventType =
  | "join"
  | "quit"
  | "kick"
  | "death"
  | "chat"
  | "countdown_done"
  | "countdown_cancelled";

export interface CompanionEvent {
  type: CompanionEventType;
  ts: number;
  uuid?: string;
  name?: string;
  firstJoin?: boolean;
  session?: number;
  reason?: string | null;
  kicked?: boolean;
  cause?: string | null;
  message?: string | null;
  killer?: string | null;
  /** Request id of a countdown */
  id?: string;
}

export interface CompanionMaintenance {
  enabled: boolean;
  message: string;
  motd: string | null;
  allow: string[];
  allowOps: boolean;
}

/** Live link state of one server */
export interface CompanionLiveState {
  connected: boolean;
  hello: CompanionHello | null;
  stats: CompanionStats | null;
  /** ms epoch of the last message */
  lastSeen: number | null;
}

/** server:companion socket payload */
export interface WsCompanionUpdate extends CompanionLiveState {
  serverId: string;
}
