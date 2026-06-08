import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  IntervalUnit,
  ScheduleMode,
  SchedulerActionType,
  SimpleScheduleKind,
} from "@shared/types/scheduler.types";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class SimpleSchedulePayloadDto {
  @ApiProperty({
    enum: SimpleScheduleKind,
    description: "Simple schedule kind",
  })
  @IsEnum(SimpleScheduleKind)
  kind: SimpleScheduleKind;

  @ApiPropertyOptional({
    description: "Interval length (with intervalUnit)",
    example: 30,
  })
  @ValidateIf((o) => o.kind === SimpleScheduleKind.INTERVAL)
  @IsInt()
  @Min(1)
  intervalValue?: number;

  @ApiPropertyOptional({ enum: IntervalUnit, description: "Interval unit" })
  @ValidateIf((o) => o.kind === SimpleScheduleKind.INTERVAL)
  @IsEnum(IntervalUnit)
  intervalUnit?: IntervalUnit;

  @ApiPropertyOptional({
    description: "Time of day in HH:mm",
    example: "03:30",
  })
  @ValidateIf(
    (o) =>
      o.kind === SimpleScheduleKind.DAILY ||
      o.kind === SimpleScheduleKind.WEEKLY,
  )
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "time must be HH:mm" })
  time?: string;

  @ApiPropertyOptional({
    description: "Weekdays (0=Sunday)",
    type: [Number],
    example: [1, 3, 5],
  })
  @ValidateIf((o) => o.kind === SimpleScheduleKind.WEEKLY)
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  weekdays?: number[];
}

export class CronSchedulePayloadDto {
  @ApiProperty({ description: "Cron expression", example: "0 3 * * *" })
  @IsString()
  @MaxLength(120)
  expression: string;
}

export class OnceSchedulePayloadDto {
  @ApiProperty({
    description: "One-shot ISO datetime",
    example: "2026-06-04T03:30:00.000Z",
  })
  @IsString()
  isoDateTime: string;
}

/**
 * Action payloads form a discriminated union keyed by type
 */
export class ServerLifecycleActionDto {
  @ApiProperty({
    enum: [
      SchedulerActionType.SERVER_START,
      SchedulerActionType.SERVER_STOP,
      SchedulerActionType.SERVER_RESTART,
    ],
    description: "Start/stop/restart the server",
  })
  @IsEnum(SchedulerActionType)
  type:
    | SchedulerActionType.SERVER_START
    | SchedulerActionType.SERVER_STOP
    | SchedulerActionType.SERVER_RESTART;
}

export class CommandActionDto {
  @ApiProperty({
    enum: [SchedulerActionType.SERVER_COMMAND],
    description: "Send a console command",
  })
  @IsEnum(SchedulerActionType)
  type: SchedulerActionType.SERVER_COMMAND;

  @ApiProperty({ description: "Console command", example: "say hello" })
  @IsString()
  @MaxLength(2000)
  command: string;
}

export class BackupActionDto {
  @ApiProperty({
    enum: [SchedulerActionType.BACKUP_CREATE],
    description: "Create a backup",
  })
  @IsEnum(SchedulerActionType)
  type: SchedulerActionType.BACKUP_CREATE;

  @ApiProperty({ description: "Backup name template", example: "auto-{date}" })
  @IsString()
  @Matches(/^[a-zA-Z0-9._\-\s{}]+$/, {
    message: "Backup name template contains invalid characters",
  })
  @MaxLength(120)
  nameTemplate: string;

  @ApiPropertyOptional({ description: "Backup description" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class WebhookActionDto {
  @ApiProperty({
    enum: [SchedulerActionType.HTTP_WEBHOOK],
    description: "Call an HTTP webhook",
  })
  @IsEnum(SchedulerActionType)
  type: SchedulerActionType.HTTP_WEBHOOK;

  @ApiProperty({
    description: "Webhook URL",
    example: "https://example.com/hook",
  })
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  url: string;

  @ApiProperty({
    description: "HTTP method",
    enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
  @IsString()
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  @ApiPropertyOptional({
    description: "Webhook headers",
    type: "object",
    additionalProperties: { type: "string" },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: "Webhook body" })
  @IsOptional()
  @IsString()
  @MaxLength(16 * 1024)
  body?: string;
}

export type ActionPayloadDto =
  | ServerLifecycleActionDto
  | CommandActionDto
  | BackupActionDto
  | WebhookActionDto;

/** Bare base used only as the class-transformer discriminator fallback */
class ActionDiscriminatorBaseDto {
  @IsEnum(SchedulerActionType)
  type: SchedulerActionType;
}

const ACTION_ONE_OF = [
  { $ref: getSchemaPath(ServerLifecycleActionDto) },
  { $ref: getSchemaPath(CommandActionDto) },
  { $ref: getSchemaPath(BackupActionDto) },
  { $ref: getSchemaPath(WebhookActionDto) },
];

const ACTION_DISCRIMINATOR = {
  propertyName: "type",
  mapping: {
    [SchedulerActionType.SERVER_START]: getSchemaPath(ServerLifecycleActionDto),
    [SchedulerActionType.SERVER_STOP]: getSchemaPath(ServerLifecycleActionDto),
    [SchedulerActionType.SERVER_RESTART]: getSchemaPath(
      ServerLifecycleActionDto,
    ),
    [SchedulerActionType.SERVER_COMMAND]: getSchemaPath(CommandActionDto),
    [SchedulerActionType.BACKUP_CREATE]: getSchemaPath(BackupActionDto),
    [SchedulerActionType.HTTP_WEBHOOK]: getSchemaPath(WebhookActionDto),
  },
};

const ACTION_TRANSFORM_DISCRIMINATOR = {
  property: "type",
  subTypes: [
    { value: ServerLifecycleActionDto, name: SchedulerActionType.SERVER_START },
    { value: ServerLifecycleActionDto, name: SchedulerActionType.SERVER_STOP },
    {
      value: ServerLifecycleActionDto,
      name: SchedulerActionType.SERVER_RESTART,
    },
    { value: CommandActionDto, name: SchedulerActionType.SERVER_COMMAND },
    { value: BackupActionDto, name: SchedulerActionType.BACKUP_CREATE },
    { value: WebhookActionDto, name: SchedulerActionType.HTTP_WEBHOOK },
  ],
};

@ApiExtraModels(
  ServerLifecycleActionDto,
  CommandActionDto,
  BackupActionDto,
  WebhookActionDto,
)
export class CreateScheduledTaskDto {
  @ApiProperty({ description: "Display name", example: "Nightly backup" })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: "Target server id", example: "srv_001" })
  @IsString()
  serverId: string;

  @ApiProperty({ description: "Whether the task is enabled", example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ enum: ScheduleMode, description: "Schedule mode" })
  @IsEnum(ScheduleMode)
  mode: ScheduleMode;

  @ApiPropertyOptional({
    type: SimpleSchedulePayloadDto,
    description: "Payload for SIMPLE mode",
  })
  @ValidateIf((o) => o.mode === ScheduleMode.SIMPLE)
  @IsObject()
  @ValidateNested()
  @Type(() => SimpleSchedulePayloadDto)
  simple?: SimpleSchedulePayloadDto;

  @ApiPropertyOptional({
    type: CronSchedulePayloadDto,
    description: "Payload for CRON mode",
  })
  @ValidateIf((o) => o.mode === ScheduleMode.CRON)
  @IsObject()
  @ValidateNested()
  @Type(() => CronSchedulePayloadDto)
  cron?: CronSchedulePayloadDto;

  @ApiPropertyOptional({
    type: OnceSchedulePayloadDto,
    description: "Payload for ONCE mode",
  })
  @ValidateIf((o) => o.mode === ScheduleMode.ONCE)
  @IsObject()
  @ValidateNested()
  @Type(() => OnceSchedulePayloadDto)
  once?: OnceSchedulePayloadDto;

  @ApiPropertyOptional({
    description: "IANA timezone",
    example: "Europe/Moscow",
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: "Action performed when the task fires",
    oneOf: ACTION_ONE_OF,
    discriminator: ACTION_DISCRIMINATOR,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ActionDiscriminatorBaseDto, {
    keepDiscriminatorProperty: true,
    discriminator: ACTION_TRANSFORM_DISCRIMINATOR,
  })
  action: ActionPayloadDto;
}

@ApiExtraModels(
  ServerLifecycleActionDto,
  CommandActionDto,
  BackupActionDto,
  WebhookActionDto,
)
export class UpdateScheduledTaskDto {
  @ApiPropertyOptional({
    description: "Display name",
    example: "Nightly backup",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: "Whether the task is enabled",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: ScheduleMode, description: "Schedule mode" })
  @IsOptional()
  @IsEnum(ScheduleMode)
  mode?: ScheduleMode;

  @ApiPropertyOptional({
    type: SimpleSchedulePayloadDto,
    description: "Payload for SIMPLE mode",
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SimpleSchedulePayloadDto)
  simple?: SimpleSchedulePayloadDto;

  @ApiPropertyOptional({
    type: CronSchedulePayloadDto,
    description: "Payload for CRON mode",
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CronSchedulePayloadDto)
  cron?: CronSchedulePayloadDto;

  @ApiPropertyOptional({
    type: OnceSchedulePayloadDto,
    description: "Payload for ONCE mode",
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OnceSchedulePayloadDto)
  once?: OnceSchedulePayloadDto;

  @ApiPropertyOptional({
    description: "IANA timezone",
    example: "Europe/Moscow",
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: "Action performed when the task fires",
    oneOf: ACTION_ONE_OF,
    discriminator: ACTION_DISCRIMINATOR,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ActionDiscriminatorBaseDto, {
    keepDiscriminatorProperty: true,
    discriminator: ACTION_TRANSFORM_DISCRIMINATOR,
  })
  action?: ActionPayloadDto;
}

export class PreviewCronDto {
  @ApiProperty({
    description: "Cron expression to preview",
    example: "0 3 * * *",
  })
  @IsString()
  @MaxLength(120)
  expression: string;

  @ApiPropertyOptional({
    description: "IANA timezone",
    example: "Europe/Moscow",
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
