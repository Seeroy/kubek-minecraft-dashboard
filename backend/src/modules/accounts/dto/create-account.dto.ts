import { ApiProperty } from "@nestjs/swagger";
import { UserPermissions } from "@shared/types/user.types";
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
  servers?: string[];

  @ApiProperty({
    description: "User permissions",
    example: ["servers_view", "file_manager"],
    type: [String],
  })
  @IsArray()
  permissions: UserPermissions[];
}
