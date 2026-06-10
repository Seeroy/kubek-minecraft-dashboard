import type {
  BlueprintFeature,
  ConfigFileSpec,
} from "@kubekpanel/blueprint-sdk";
import { ApiProperty } from "@nestjs/swagger";

/** Summary of an installable server-type blueprint, as listed for server creation */
export class ServerTypeDto {
  @ApiProperty({ description: "Blueprint id", example: "com.kubek.paper" })
  id: string;

  @ApiProperty({ description: "Display name", example: "Paper" })
  name: string;

  @ApiProperty({ required: false, description: "Short name" })
  shortName?: string;

  @ApiProperty({ required: false, description: "Description" })
  description?: string;

  @ApiProperty({
    required: false,
    description: "Game identifier",
    example: "minecraft",
  })
  game?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Icon as a data URI",
  })
  icon?: string | null;

  @ApiProperty({ required: false, description: "Blueprint version" })
  version?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: "Supported platforms",
  })
  platforms?: string[];

  @ApiProperty({ description: "Runtime kind", example: "native" })
  runtimeKind: string;

  @ApiProperty({
    description: "Whether this blueprint can run in Docker (has a docker profile)",
    example: true,
  })
  dockerCapable: boolean;

  @ApiProperty({
    description: "Declared blueprint variables",
    additionalProperties: true,
  })
  variables: Record<string, any>;

  @ApiProperty({ description: "Declared ports", additionalProperties: true })
  ports: Record<string, any>;

  @ApiProperty({ description: "Config files exposed by the blueprint" })
  configFiles: ConfigFileSpec[];

  @ApiProperty({ description: "Optional blueprint features" })
  features: BlueprintFeature[];

  @ApiProperty({
    description: "Where the blueprint was loaded from",
    example: "bundled",
  })
  source: string;
}

/** Result of installing a blueprint from an uploaded file */
export class ServerTypeInstallResponseDto {
  @ApiProperty({ description: "Blueprint id", example: "com.kubek.paper" })
  id: string;

  @ApiProperty({ description: "Display name", example: "Paper" })
  name: string;

  @ApiProperty({
    description: "Whether the installed blueprint validated successfully",
    example: true,
  })
  valid: boolean;
}
