import { ApiProperty } from "@nestjs/swagger";
import { UserPermissions } from "@shared/types/user.types";

/** Restriction of a non-admin user to a subset of servers */
export class UserServersRestrictDto {
  @ApiProperty({
    description: "Whether server access is restricted",
    example: false,
  })
  enabled: boolean;

  @ApiProperty({
    description: "Allowed server IDs when restricted",
    type: [String],
    example: [],
  })
  allowed: string[];
}

/** Public projection of a user account (no secrets). Mirrors toPublicUser */
export class PublicUserDto {
  @ApiProperty({ description: "User ID", example: "user_456" })
  id: string;

  @ApiProperty({ description: "Username", example: "admin" })
  username: string;

  @ApiProperty({
    description: "Granted permissions",
    enum: UserPermissions,
    isArray: true,
  })
  permissions: UserPermissions[];

  @ApiProperty({ type: UserServersRestrictDto })
  serversRestrict: UserServersRestrictDto;

  @ApiProperty({
    description: "Whether the user is an administrator",
    required: false,
    example: true,
  })
  isAdmin?: boolean;

  @ApiProperty({
    description: "Whether the user finished onboarding",
    example: true,
  })
  oobeCompleted: boolean;
}
