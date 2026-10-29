import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { InstallModpackProps } from "@shared/types/modpack.types";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class InstallModpackDto implements InstallModpackProps {
  @ApiProperty({ description: "packId from the inspect response" })
  @IsUUID()
  packId!: string;

  @ApiProperty({ example: "All the Fabric" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ example: 25565 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ description: "Max heap in MB", example: 4096 })
  @IsOptional()
  @IsInt()
  @Min(512)
  memory?: number;

  @ApiPropertyOptional({ description: "Managed Java major", example: 21 })
  @IsOptional()
  @IsInt()
  @Min(8)
  javaVersion?: number;

  @ApiPropertyOptional({ description: "Custom Java path override" })
  @IsOptional()
  @IsString()
  javaPath?: string;
}
