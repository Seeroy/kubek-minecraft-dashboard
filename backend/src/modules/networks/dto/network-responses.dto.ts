import { ApiProperty } from "@nestjs/swagger";
import type {
  BackendForwardingKind,
  DiffLine,
  ForwardingMode,
  Network,
  NetworkBackendCandidate,
  NetworkCandidates,
  NetworkChangeResult,
  NetworkFileChange,
  NetworkMember,
  NetworkPlan,
  NetworkPlanNote,
  NetworkProxyCandidate,
  NetworkServerRef,
  VelocitySettings,
} from "@shared/types/network.types";
import type { SecretHint } from "@shared/types/secret.types";
import { ServerStatus } from "@shared/types/server/server.types";

const MODES = ["modern", "legacy"];
const KINDS = ["paper", "fabric", "spigot"];

export class NetworkServerRefDto implements NetworkServerRef {
  @ApiProperty()
  serverId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: "com.kubek.paper" })
  blueprintId!: string;

  @ApiProperty({ enum: ServerStatus })
  status!: ServerStatus;
}

export class NetworkMemberDto
  extends NetworkServerRefDto
  implements NetworkMember
{
  @ApiProperty({ example: "lobby" })
  alias!: string;

  @ApiProperty({ type: Number, nullable: true })
  tryOrder!: number | null;

  @ApiProperty({ example: "127.0.0.1:25566" })
  address!: string;
}

class SecretHintDto implements SecretHint {
  @ApiProperty()
  set!: boolean;

  @ApiProperty({ type: String, nullable: true })
  hint!: string | null;
}

export class NetworkDto implements Network {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: MODES })
  forwardingMode!: ForwardingMode;

  @ApiProperty({ description: "ms epoch" })
  createdAt!: number;

  @ApiProperty({ type: NetworkServerRefDto })
  proxy!: NetworkServerRefDto;

  @ApiProperty({ type: [NetworkMemberDto] })
  members!: NetworkMemberDto[];

  @ApiProperty({ type: SecretHintDto })
  secret!: SecretHintDto;
}

class BackendCandidateDto
  extends NetworkServerRefDto
  implements NetworkBackendCandidate
{
  @ApiProperty({ enum: KINDS })
  kind!: BackendForwardingKind;

  @ApiProperty({ enum: MODES, isArray: true })
  modes!: ForwardingMode[];
}

class CreatableBackendDto {
  @ApiProperty()
  blueprintId!: string;

  @ApiProperty({ enum: KINDS })
  kind!: BackendForwardingKind;
}

class VelocitySettingsValuesDto implements VelocitySettings {
  @ApiProperty()
  motd!: string;

  @ApiProperty()
  showMaxPlayers!: number;

  @ApiProperty()
  onlineMode!: boolean;

  @ApiProperty()
  forceKeyAuthentication!: boolean;

  @ApiProperty()
  preventClientProxyConnections!: boolean;

  @ApiProperty()
  kickExistingPlayers!: boolean;

  @ApiProperty()
  announceForge!: boolean;

  @ApiProperty()
  compressionThreshold!: number;

  @ApiProperty()
  loginRatelimit!: number;

  @ApiProperty()
  connectionTimeout!: number;

  @ApiProperty()
  readTimeout!: number;

  @ApiProperty()
  haproxyProtocol!: boolean;

  @ApiProperty()
  failoverOnUnexpectedServerDisconnect!: boolean;

  @ApiProperty()
  logPlayerConnections!: boolean;

  @ApiProperty()
  acceptsTransfers!: boolean;

  @ApiProperty()
  queryEnabled!: boolean;
}

class ProxyCandidateDto
  extends NetworkServerRefDto
  implements NetworkProxyCandidate
{
  @ApiProperty({ type: VelocitySettingsValuesDto })
  settings!: VelocitySettingsValuesDto;
}

export class NetworkCandidatesDto implements NetworkCandidates {
  @ApiProperty({ type: [ProxyCandidateDto] })
  proxies!: ProxyCandidateDto[];

  @ApiProperty({ type: [BackendCandidateDto] })
  backends!: BackendCandidateDto[];

  @ApiProperty({ type: [CreatableBackendDto] })
  creatable!: CreatableBackendDto[];

  @ApiProperty({ type: VelocitySettingsValuesDto })
  velocityDefaults!: VelocitySettingsValuesDto;
}

class NetworkFileChangeDto implements NetworkFileChange {
  @ApiProperty({ type: String, nullable: true })
  serverId!: string | null;

  @ApiProperty()
  serverName!: string;

  @ApiProperty({ example: "velocity.toml" })
  path!: string;

  @ApiProperty({ enum: ["create", "update"] })
  kind!: "create" | "update";

  @ApiProperty({
    type: "array",
    items: { type: "object" },
    description: "same, add and del lines, skip folds unchanged runs",
  })
  diff!: DiffLine[];
}

export class NetworkPlanDto implements NetworkPlan {
  @ApiProperty({ enum: MODES })
  forwardingMode!: ForwardingMode;

  @ApiProperty({ type: [NetworkFileChangeDto] })
  changes!: NetworkFileChangeDto[];

  @ApiProperty({ type: "array", items: { type: "object" } })
  notes!: NetworkPlanNote[];

  @ApiProperty({ type: [String] })
  restart!: string[];
}

export class NetworkChangeResultDto implements NetworkChangeResult {
  @ApiProperty()
  networkId!: string;

  @ApiProperty({ type: [String], description: "Running servers to restart" })
  restart!: string[];
}
