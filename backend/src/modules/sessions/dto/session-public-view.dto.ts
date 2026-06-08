import { ApiProperty } from "@nestjs/swagger";

/** Public projection of an active user session */
export class SessionPublicViewDto {
  @ApiProperty({ description: "Session ID", example: "sess_123" })
  id: string;

  @ApiProperty({
    description: "Client IP address, or null",
    nullable: true,
    example: "203.0.113.4",
  })
  ip: string | null;

  @ApiProperty({
    description: "Client user agent, or null",
    nullable: true,
    example: "Mozilla/5.0 ...",
  })
  userAgent: string | null;

  @ApiProperty({ description: "Created at (epoch ms)", example: 1735689600000 })
  createdAt: number;

  @ApiProperty({
    description: "Last seen at (epoch ms)",
    example: 1735689600000,
  })
  lastSeenAt: number;

  @ApiProperty({
    description: "Expiry (epoch ms), or null when non-expiring",
    nullable: true,
    example: 1738281600000,
  })
  expiresAt: number | null;

  @ApiProperty({
    description: "Whether this is the session making the request",
    example: true,
  })
  current: boolean;
}
