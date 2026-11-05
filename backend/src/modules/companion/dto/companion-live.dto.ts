import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CompanionCaps,
  CompanionGc,
  CompanionHello,
  CompanionJvm,
  CompanionLiveState,
  CompanionMspt,
  CompanionMsptSource,
  CompanionPlayer,
  CompanionPluginSettings,
  CompanionStats,
  CompanionTpsSource,
  CompanionWorld,
} from "@shared/types/companion.types";

const TPS_SOURCES: CompanionTpsSource[] = [
  "PAPER",
  "SPIGOT",
  "FOLIA",
  "COUNTER",
];
const MSPT_SOURCES: CompanionMsptSource[] = [
  "EVENTS",
  "AVERAGE",
  "SAMPLED",
  "NONE",
];

export class CompanionCapsDto implements CompanionCaps {
  @ApiProperty({ enum: TPS_SOURCES, enumName: "CompanionTpsSource" })
  tps!: CompanionTpsSource;

  @ApiProperty({ enum: MSPT_SOURCES, enumName: "CompanionMsptSource" })
  mspt!: CompanionMsptSource;

  @ApiProperty()
  folia!: boolean;

  @ApiProperty()
  ping!: boolean;

  @ApiProperty()
  tileCounters!: boolean;

  @ApiProperty()
  bossBar!: boolean;
}

export class CompanionPluginSettingsDto implements CompanionPluginSettings {
  @ApiProperty()
  intervalSec!: number;

  @ApiProperty()
  coords!: boolean;

  @ApiProperty()
  chat!: boolean;
}

class CompanionServerInfoDto {
  @ApiProperty({ example: "Paper" })
  name!: string;

  @ApiProperty()
  version!: string;

  @ApiProperty({ example: "1.21.11-R0.1-SNAPSHOT" })
  bukkitVersion!: string;

  @ApiProperty()
  onlineMode!: boolean;
}

class CompanionJavaInfoDto {
  @ApiProperty({ example: "21.0.5" })
  version!: string;

  @ApiProperty()
  vendor!: string;

  @ApiProperty()
  vm!: string;
}

export class CompanionHelloDto implements CompanionHello {
  @ApiProperty()
  protocol!: number;

  @ApiProperty({ description: "Plugin version", example: "1.0.0" })
  plugin!: string;

  @ApiProperty({ type: CompanionServerInfoDto })
  server!: CompanionServerInfoDto;

  @ApiProperty({ type: CompanionJavaInfoDto })
  java!: CompanionJavaInfoDto;

  @ApiProperty({ type: CompanionCapsDto })
  caps!: CompanionCapsDto;

  @ApiProperty({ type: CompanionPluginSettingsDto })
  settings!: CompanionPluginSettingsDto;
}

export class CompanionMsptDto implements CompanionMspt {
  @ApiProperty({ example: "events" })
  source!: string;

  @ApiProperty()
  avg!: number;

  @ApiPropertyOptional()
  p50?: number;

  @ApiPropertyOptional()
  p95?: number;

  @ApiPropertyOptional()
  p99?: number;

  @ApiPropertyOptional()
  max?: number;

  @ApiPropertyOptional()
  ticks?: number;

  @ApiPropertyOptional({ description: "Busy share of the main thread, 0..1" })
  load?: number;

  @ApiPropertyOptional({
    description: "Folia, player readings behind the worst region average",
  })
  samples?: number;
}

export class CompanionGcDto implements CompanionGc {
  @ApiProperty()
  count!: number;

  @ApiProperty()
  timeMs!: number;

  @ApiPropertyOptional()
  pauses?: number;

  @ApiPropertyOptional()
  pauseMs?: number;

  @ApiPropertyOptional()
  maxPauseMs?: number;
}

export class CompanionJvmDto implements CompanionJvm {
  @ApiProperty()
  heapUsed!: number;

  @ApiProperty()
  heapCommitted!: number;

  @ApiProperty()
  heapMax!: number;

  @ApiProperty()
  nonHeapUsed!: number;

  @ApiProperty()
  threads!: number;

  @ApiProperty()
  daemonThreads!: number;

  @ApiProperty({ description: "JVM uptime in ms" })
  uptime!: number;

  @ApiProperty({ type: CompanionGcDto })
  gc!: CompanionGcDto;
}

export class CompanionWorldDto implements CompanionWorld {
  @ApiProperty()
  name!: string;

  @ApiProperty({ example: "NORMAL" })
  env!: string;

  @ApiProperty({ type: Number, nullable: true })
  players!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  chunks!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  entities!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  tiles!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  tickingTiles!: number | null;
}

export class CompanionPlayerDto implements CompanionPlayer {
  @ApiProperty()
  uuid!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  world!: string;

  @ApiProperty({ example: "SURVIVAL" })
  gamemode!: string;

  @ApiProperty({ type: Number, nullable: true })
  ping!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Join time, ms epoch",
  })
  since!: number | null;

  @ApiPropertyOptional()
  x?: number;

  @ApiPropertyOptional()
  y?: number;

  @ApiPropertyOptional()
  z?: number;
}

export class CompanionStatsDto implements CompanionStats {
  @ApiProperty()
  ts!: number;

  @ApiProperty()
  intervalSec!: number;

  @ApiProperty({ type: [Number], nullable: true, description: "1m, 5m, 15m" })
  tps!: number[] | null;

  @ApiProperty({ enum: TPS_SOURCES, enumName: "CompanionTpsSource" })
  tpsSource!: CompanionTpsSource;

  @ApiProperty({ type: CompanionMsptDto, nullable: true })
  mspt!: CompanionMsptDto | null;

  @ApiProperty({ type: CompanionJvmDto })
  jvm!: CompanionJvmDto;

  @ApiProperty()
  online!: number;

  @ApiProperty()
  maxPlayers!: number;

  @ApiProperty({ type: [CompanionWorldDto] })
  worlds!: CompanionWorldDto[];

  @ApiProperty({ type: [CompanionPlayerDto] })
  players!: CompanionPlayerDto[];
}

export class CompanionLiveStateDto implements CompanionLiveState {
  @ApiProperty()
  connected!: boolean;

  @ApiProperty({ type: CompanionHelloDto, nullable: true })
  hello!: CompanionHelloDto | null;

  @ApiProperty({ type: CompanionStatsDto, nullable: true })
  stats!: CompanionStatsDto | null;

  @ApiProperty({ type: Number, nullable: true })
  lastSeen!: number | null;
}
