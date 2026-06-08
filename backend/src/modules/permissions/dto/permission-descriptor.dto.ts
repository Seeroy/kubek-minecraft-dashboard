import { ApiProperty } from "@nestjs/swagger";

/** A grantable permission descriptor (core or extension-declared). Mirrors PermissionDef */
export class PermissionDescriptorDto {
  @ApiProperty({
    description: "Permission key",
    example: "accounts_management",
  })
  key: string;

  @ApiProperty({
    description: "Human-readable label",
    example: "ACCOUNTS_MANAGEMENT",
  })
  label: string;

  @ApiProperty({
    description: "Logical group for UI grouping",
    required: false,
    example: "core",
  })
  group?: string;

  @ApiProperty({
    description:
      '"core" for built-in permissions, otherwise the declaring extension id',
    example: "core",
  })
  source: string;
}
