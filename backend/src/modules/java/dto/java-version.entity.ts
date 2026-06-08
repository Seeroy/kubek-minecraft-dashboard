import { ApiProperty } from "@nestjs/swagger";

/** A Java runtime/JDK installation, available or installed */
export class JavaVersionEntity {
  @ApiProperty({ description: "Java version identifier", example: "21" })
  version: string;

  @ApiProperty({ description: "Display name", example: "Temurin 21" })
  name: string;

  @ApiProperty({ description: "Distribution type", enum: ["jdk", "jre"] })
  type: "jdk" | "jre";

  @ApiProperty({ description: "Target operating system", example: "linux" })
  os: string;

  @ApiProperty({ description: "Target architecture", example: "x64" })
  arch: string;

  @ApiProperty({
    description: "Filesystem path to the installation",
    required: false,
  })
  path?: string;

  @ApiProperty({
    description: "Distribution vendor",
    required: false,
    example: "Eclipse Adoptium",
  })
  vendor?: string;

  @ApiProperty({ description: "Build identifier", required: false })
  build?: string;

  @ApiProperty({ description: "Runtime descriptor", required: false })
  runtime?: string;

  @ApiProperty({
    description: "Download URL for available (not yet installed) versions",
    required: false,
  })
  downloadUrl?: string;
}
