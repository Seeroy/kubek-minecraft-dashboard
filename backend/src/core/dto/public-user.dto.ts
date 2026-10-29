import { ApiProperty } from "@nestjs/swagger";
import { AccessMapDto, UserAccessDto } from "./access.dto";

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
    description: "Assigned role ids",
    type: [String],
    example: ["builtin:viewer"],
  })
  roles: string[];

  @ApiProperty({
    type: AccessMapDto,
    description: "Personal levels on top of the roles",
  })
  grants: AccessMapDto;

  @ApiProperty({
    description: "Personal extension permission keys",
    type: [String],
    example: [],
  })
  extPermissions: string[];

  @ApiProperty({
    type: UserAccessDto,
    description: "Effective access from roles and personal grants",
  })
  access: UserAccessDto;

  @ApiProperty({ type: UserServersRestrictDto })
  serversRestrict: UserServersRestrictDto;

  @ApiProperty({
    description: "Whether the user is an administrator",
    example: true,
  })
  isAdmin: boolean;

  @ApiProperty({
    description: "Whether the user finished onboarding",
    example: true,
  })
  oobeCompleted: boolean;

  @ApiProperty({
    description:
      "Minecraft nickname used for the avatar, null to use the username",
    nullable: true,
    type: String,
    example: "Notch",
  })
  skinName: string | null;

  @ApiProperty({
    description: "When the account FTP password was set (ms), null without one",
    nullable: true,
    type: Number,
    example: 1735689600000,
  })
  ftpPasswordSetAt: number | null;
}
