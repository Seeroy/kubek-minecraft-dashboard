import { AccessMapDto, IsAccessMap } from "@/core/dto/access.dto";
import { ApiProperty } from "@nestjs/swagger";
import type { AccessMap } from "@shared/access/areas";
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class RoleResponseDto {
  @ApiProperty({ example: "builtin:viewer" })
  id: string;

  @ApiProperty({ example: "Viewer" })
  name: string;

  @ApiProperty({ nullable: true, type: String, example: null })
  description: string | null;

  @ApiProperty({
    description: "Shipped with the panel, can't be renamed or deleted",
    example: true,
  })
  builtin: boolean;

  @ApiProperty({ nullable: true, type: String, example: "viewer" })
  builtinKey: string | null;

  @ApiProperty({ type: AccessMapDto })
  grants: AccessMapDto;

  @ApiProperty({
    description: "Extension permission keys",
    type: [String],
    example: [],
  })
  ext: string[];

  @ApiProperty({ description: "Accounts holding the role", example: 2 })
  members: number;

  @ApiProperty({ example: 1735689600000 })
  createdAt: number;

  @ApiProperty({ example: 1735689600000 })
  updatedAt: number;
}

export class CreateRoleDto {
  @ApiProperty({ example: "Builders", maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 256 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(256)
  description?: string | null;

  @ApiProperty({ type: AccessMapDto, required: false })
  @IsOptional()
  @IsAccessMap()
  grants?: AccessMap;

  @ApiProperty({
    description: "Extension permission keys",
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ext?: string[];
}

export class UpdateRoleDto {
  @ApiProperty({
    required: false,
    maxLength: 64,
    description: "Built-in roles keep their name",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name?: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 256 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(256)
  description?: string | null;

  @ApiProperty({
    type: AccessMapDto,
    required: false,
    description: "Replaces all levels of the role",
  })
  @IsOptional()
  @IsAccessMap()
  grants?: AccessMap;

  @ApiProperty({
    description: "Replaces the extension permission keys",
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ext?: string[];
}

export class DuplicateRoleDto {
  @ApiProperty({
    required: false,
    maxLength: 64,
    description: 'Name of the copy, "<name> (copy)" when left out',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name?: string;
}
