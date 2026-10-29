import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

// Modrinth ids and slugs, never paths
const MODRINTH_ID = /^[\w.-]{1,64}$/;

export class InspectModrinthDto {
  @ApiProperty({ description: "Modrinth project id or slug" })
  @IsString()
  @Matches(MODRINTH_ID)
  projectId: string;

  @ApiProperty({ description: "Modrinth version id" })
  @IsString()
  @Matches(MODRINTH_ID)
  versionId: string;
}
