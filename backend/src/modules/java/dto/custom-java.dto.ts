import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/** Request to validate or register a Java installation at an arbitrary local path */
export class CustomJavaRequestDto {
  @ApiProperty({
    description: "Path to a java binary or an installation folder",
    example: "/opt/jdk-21",
  })
  @IsString()
  @IsNotEmpty()
  path!: string;

  @ApiProperty({
    description: "Optional display name",
    required: false,
    example: "GraalVM 21",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;
}

/** Result of probing a Java path with java -version */
export class JavaPathValidationDto {
  @ApiProperty({ description: "Whether a working java was found at the path" })
  valid!: boolean;

  @ApiProperty({
    description: "Resolved path to the java binary",
    required: false,
  })
  resolvedPath?: string;

  @ApiProperty({ description: "Detected version", required: false })
  version?: string;

  @ApiProperty({ description: "Detected vendor", required: false })
  vendor?: string;

  @ApiProperty({ description: "Detected runtime string", required: false })
  runtime?: string;

  @ApiProperty({ description: "Failure reason", required: false })
  error?: string;
}
