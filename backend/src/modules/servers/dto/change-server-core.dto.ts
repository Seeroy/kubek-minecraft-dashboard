import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Switch an existing (stopped) server to another core/blueprint
 */
export class ChangeServerCoreDto {
  @ApiProperty({
    description: "Target blueprint (core) id to switch to",
    example: "com.kubek.purpur",
  })
  @IsString()
  @IsNotEmpty()
  blueprintId!: string;

  @ApiProperty({
    required: false,
    description:
      "Version to install. Required for cores that offer a version list.",
    example: "1.21.4",
  })
  @IsOptional()
  @IsString()
  version?: string;
}
