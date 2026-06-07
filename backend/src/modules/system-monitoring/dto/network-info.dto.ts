import { ApiProperty } from "@nestjs/swagger";

export class NetworkInfoDto {
  @ApiProperty({
    description: "Public IPv4 address (null if unavailable)",
    example: "203.0.113.42",
    nullable: true,
  })
  publicIp: string | null;

  @ApiProperty({
    description: "List of detected local (private) IPv4 addresses",
    example: ["192.168.1.10", "10.0.0.5"],
    type: [String],
  })
  privateIps: string[];
}
