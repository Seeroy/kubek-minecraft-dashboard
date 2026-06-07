import { ApiProperty } from "@nestjs/swagger";

/** Embedded FTP service configuration */
export class FtpServiceDto {
  @ApiProperty({
    description: "Whether the FTP service is enabled",
    example: false,
  })
  enabled: boolean;

  @ApiProperty({ description: "FTP username", required: false })
  username?: string;

  @ApiProperty({ description: "FTP password", required: false })
  password?: string;

  @ApiProperty({ description: "FTP port", required: false, example: 21 })
  port?: number;
}

/** Subnet-based access restriction configuration */
export class SubnetsAccessDto {
  @ApiProperty({
    description: "Whether subnet restriction is enabled",
    example: false,
  })
  enabled: boolean;

  @ApiProperty({
    description: "Allowed subnets in CIDR notation",
    type: [String],
    required: false,
  })
  subnets?: string[];
}

/** Telegram bot integration configuration */
export class TelegramBotDto {
  @ApiProperty({
    description: "Whether the Telegram bot is enabled",
    example: false,
  })
  enabled: boolean;

  @ApiProperty({ description: "Telegram bot token", required: false })
  token?: string;

  @ApiProperty({
    description: "Chat IDs that receive notifications",
    type: [String],
    required: false,
  })
  chatIds?: string[];
}

/** Telemetry configuration */
export class TelemetrySettingsDto {
  @ApiProperty({ description: "Whether telemetry is enabled", example: true })
  enabled: boolean;
}

/** Full Kubek configuration object */
export class ConfigurationDto {
  @ApiProperty({
    description: "Whether the Minecraft EULA has been accepted",
    example: true,
  })
  eulaAccepted: boolean;

  @ApiProperty({
    description: "FTP service configuration",
    type: FtpServiceDto,
  })
  ftpd: FtpServiceDto;

  @ApiProperty({
    description: "Whether authorization is enabled",
    example: true,
  })
  authorization: boolean;

  @ApiProperty({
    description: "Subnet access restriction configuration",
    type: SubnetsAccessDto,
  })
  subnetsAccessRestriction: SubnetsAccessDto;

  @ApiProperty({
    description: "Telegram bot configuration",
    type: TelegramBotDto,
  })
  telegramBot: TelegramBotDto;

  @ApiProperty({
    description: "Telemetry configuration",
    type: TelemetrySettingsDto,
    required: false,
  })
  telemetry?: TelemetrySettingsDto;

  @ApiProperty({ description: "HTTP port the panel listens on", example: 3000 })
  port: number;

  @ApiProperty({ description: "Configuration schema version", example: 1 })
  configVersion: number;
}
