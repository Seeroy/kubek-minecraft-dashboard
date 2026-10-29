import { ApiProperty } from "@nestjs/swagger";
import { AccessMapDto, IsAccessMap } from "@/core/dto/access.dto";
import type { AccessMap } from "@shared/access/areas";
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

/**
 * DTO for creating a new account
 */
export class CreateAccountDto {
  @ApiProperty({
    description: "Username",
    example: "user123",
    minLength: 3,
    maxLength: 32,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username: string;

  @ApiProperty({
    description: "Password",
    example: "securePassword123",
    minLength: 6,
    maxLength: 64,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;

  @ApiProperty({
    description: "Server restrictions (if any)",
    example: ["server1", "server2"],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  servers?: string[];

  @ApiProperty({
    description: "Assigned role ids",
    type: [String],
    required: false,
    example: ["builtin:viewer"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiProperty({
    type: AccessMapDto,
    required: false,
    description: "Personal levels on top of the roles",
  })
  @IsOptional()
  @IsAccessMap()
  grants?: AccessMap;

  @ApiProperty({
    description: "Personal extension permission keys",
    type: [String],
    required: false,
    example: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extPermissions?: string[];
}
