import { ApiProperty } from "@nestjs/swagger";

export class SystemInfoDto {
  @ApiProperty({
    description: "System hostname",
    example: "kubek-server",
  })
  hostname: string;

  @ApiProperty({
    description: "Operating system platform",
    example: "linux",
  })
  platform: string;

  @ApiProperty({
    description: "System architecture",
    example: "x64",
  })
  arch: string;

  @ApiProperty({
    description: "Operating system release version",
    example: "5.4.0-74-generic",
  })
  release: string;

  @ApiProperty({
    description: "System uptime in seconds",
    example: 1234567,
  })
  uptime: number;

  @ApiProperty({
    description: "CPU model names, one entry per logical core",
    type: [String],
    example: ["Apple M1 Pro", "Apple M1 Pro"],
  })
  cpus: string[];

  @ApiProperty({
    description: "Whether a Docker daemon is reachable from the panel",
    example: true,
  })
  dockerAvailable: boolean;
}
