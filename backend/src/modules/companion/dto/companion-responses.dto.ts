import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CompanionEventType,
  CompanionMaintenance,
} from "@shared/types/companion.types";
import { CompanionLiveStateDto } from "./companion-live.dto";

export const COMPANION_EVENT_TYPES: CompanionEventType[] = [
  "join",
  "quit",
  "kick",
  "death",
  "chat",
  "countdown_done",
  "countdown_cancelled",
];

export class CompanionMaintenanceDto implements CompanionMaintenance {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ description: "Kick message, & color codes" })
  message!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Server list MOTD while it's on",
  })
  motd!: string | null;

  @ApiProperty({ type: [String], description: "Names or UUIDs let in anyway" })
  allow!: string[];

  @ApiProperty()
  allowOps!: boolean;
}

export class CompanionInstalledDto {
  @ApiProperty({ example: "KubekCompanion-1.0.0.jar" })
  fileName!: string;

  @ApiProperty({ example: "1.0.0" })
  version!: string;
}

export class CompanionReleaseDto {
  @ApiProperty({ example: "1.0.0" })
  version!: string;

  @ApiProperty({ description: "Release page" })
  url!: string;

  @ApiProperty()
  publishedAt!: string;
}

export class CompanionSettingsDto {
  @ApiProperty({ description: "Joins and quits go to the activity feed" })
  sessions!: boolean;

  @ApiProperty({ description: "Kicks go to the activity feed" })
  kicks!: boolean;

  @ApiProperty({ description: "Deaths go to the activity feed" })
  deaths!: boolean;

  @ApiProperty({ description: "Chat messages go to the activity feed" })
  chat!: boolean;

  @ApiProperty({ description: "Player coordinates are sent with stats" })
  coords!: boolean;
}

export class CompanionOverviewDto {
  @ApiProperty({ description: "Server type can run the plugin" })
  supported!: boolean;

  @ApiProperty({ type: CompanionInstalledDto, nullable: true })
  installed!: CompanionInstalledDto | null;

  @ApiProperty({ type: CompanionReleaseDto, nullable: true })
  latest!: CompanionReleaseDto | null;

  @ApiProperty()
  updateAvailable!: boolean;

  @ApiProperty({ type: CompanionLiveStateDto })
  live!: CompanionLiveStateDto;

  @ApiProperty({ type: CompanionSettingsDto })
  settings!: CompanionSettingsDto;

  @ApiProperty({ type: CompanionMaintenanceDto, nullable: true })
  maintenance!: CompanionMaintenanceDto | null;

  @ApiProperty({ example: "https://github.com/KubekPanel/kubek-companion" })
  repoUrl!: string;
}

export class CompanionInstallResultDto {
  @ApiProperty({ type: CompanionInstalledDto })
  installed!: CompanionInstalledDto;

  @ApiProperty({
    description: "Server is running, the plugin loads on the next start",
  })
  restartRequired!: boolean;
}

export class CompanionMetricPointDto {
  @ApiProperty()
  ts!: number;

  @ApiProperty({ type: Number, nullable: true })
  tps!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Lowest TPS in the bucket",
  })
  tpsMin!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  mspt!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Slowest MSPT in the bucket",
  })
  msptMax!: number | null;

  @ApiProperty()
  heapUsed!: number;

  @ApiProperty()
  heapMax!: number;

  @ApiProperty()
  players!: number;

  @ApiProperty()
  playersMax!: number;
}

export class CompanionEventDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: COMPANION_EVENT_TYPES, enumName: "CompanionEventType" })
  type!: CompanionEventType;

  @ApiProperty()
  ts!: number;

  @ApiPropertyOptional()
  uuid?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  firstJoin?: boolean;

  @ApiPropertyOptional({ description: "Session length in ms, quit only" })
  session?: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  reason?: string | null;

  @ApiPropertyOptional()
  kicked?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  cause?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  message?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  killer?: string | null;
}

export class CompanionEventsPageDto {
  @ApiProperty({ type: [CompanionEventDto] })
  items!: CompanionEventDto[];

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Pass as before for the next page",
  })
  nextBefore!: number | null;
}

export class CompanionPlaytimeDto {
  @ApiProperty()
  uuid!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  playtimeMs!: number;

  @ApiProperty()
  sessions!: number;

  @ApiProperty()
  lastSeen!: number;
}

export class CompanionActivityDto {
  @ApiProperty({ description: "Most players online at once in the period" })
  peakOnline!: number;

  @ApiProperty({ type: [CompanionPlaytimeDto] })
  top!: CompanionPlaytimeDto[];
}

class LagTypeCountDto {
  @ApiProperty({ example: "ITEM" })
  type!: string;

  @ApiProperty()
  count!: number;
}

class LagChunkDto {
  @ApiProperty()
  x!: number;

  @ApiProperty()
  z!: number;

  @ApiProperty()
  count!: number;

  @ApiProperty({ type: [LagTypeCountDto] })
  types!: LagTypeCountDto[];
}

class LagWorldDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  chunks!: number;

  @ApiProperty()
  entities!: number;

  @ApiProperty({ type: [LagTypeCountDto] })
  entityTypes!: LagTypeCountDto[];

  @ApiProperty({ type: [LagChunkDto] })
  topEntityChunks!: LagChunkDto[];

  @ApiProperty({
    type: [LagChunkDto],
    nullable: true,
    description: "Null where counting tiles would be too heavy",
  })
  topTileChunks!: LagChunkDto[] | null;
}

class LagTaskDto {
  @ApiProperty()
  plugin!: string;

  @ApiProperty()
  sync!: number;

  @ApiProperty()
  async!: number;

  @ApiProperty()
  running!: number;
}

export class CompanionLagReportDto {
  @ApiProperty()
  ts!: number;

  @ApiPropertyOptional({ description: "Folia, no entity scan" })
  partial?: boolean;

  @ApiProperty({ type: [LagWorldDto] })
  worlds!: LagWorldDto[];

  @ApiProperty({ type: [LagTaskDto], nullable: true })
  tasks!: LagTaskDto[] | null;
}

export class CompanionLivePluginDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ type: [String] })
  authors!: string[];

  @ApiProperty({ type: String, nullable: true })
  apiVersion!: string | null;

  @ApiProperty({ type: [String] })
  depend!: string[];

  @ApiProperty({ type: [String] })
  softDepend!: string[];
}
