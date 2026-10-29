import { ApiProperty } from "@nestjs/swagger";

/** A grantable extension permission. Mirrors PermissionDef */
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
    description: "Id of the extension that declares it",
    example: "com.author.name",
  })
  source: string;
}
