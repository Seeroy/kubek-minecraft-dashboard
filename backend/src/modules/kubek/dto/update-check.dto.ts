import { ApiProperty } from "@nestjs/swagger";

/** Result of checking GitHub for a newer panel release */
export class UpdateCheckResultDto {
  @ApiProperty({
    description: "Whether a newer version is available on GitHub",
    example: false,
  })
  updateAvailable: boolean;

  @ApiProperty({
    description: "Latest version published on GitHub (without the 'v' prefix)",
    example: "1.2.0",
  })
  latestVersion: string;

  @ApiProperty({
    description: "Release notes (markdown) for the latest version",
    required: false,
  })
  releaseNotes?: string;
}
