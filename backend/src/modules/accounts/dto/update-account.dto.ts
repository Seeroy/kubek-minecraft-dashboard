import { ApiProperty } from "@nestjs/swagger";
import { AccessMapDto, IsAccessMap } from "@/core/dto/access.dto";
import type { AccessMap } from "@shared/access/areas";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

class ServersRestrictDto {
  @ApiProperty({ description: "Whether server access is restricted" })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: "Allowed server ids", type: [String] })
  @IsArray()
  @IsString({ each: true })
  allowed: string[];
}

/**
 * Whitelisted fields accepted when updating an account
 */
export class UpdateAccountDto {
  @ApiProperty({
    description: "Username",
    required: false,
    minLength: 3,
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username?: string;

  @ApiProperty({
    description: "New password",
    required: false,
    minLength: 6,
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password?: string;

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

  @ApiProperty({ description: "Server access restrictions", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServersRestrictDto)
  serversRestrict?: ServersRestrictDto;

  @ApiProperty({
    description: "Admin flag (only honored for admin callers)",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
