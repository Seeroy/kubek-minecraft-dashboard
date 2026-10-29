import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  NotificationCategory,
  NotificationChannel,
  type NotificationPrefs,
  type NotificationSeverity,
} from "@shared/types/notification.types";

export class NotificationsQueryDto {
  @ApiProperty({ required: false, default: 30, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  unread: boolean = false;

  @ApiProperty({
    required: false,
    description: "nextCursor of the previous page",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;
}

export class NotificationDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ example: "task.failed" }) kind: string;
  @ApiProperty({ enum: NotificationCategory }) category: NotificationCategory;
  @ApiProperty({ enum: ["info", "success", "warning", "error"] })
  severity: NotificationSeverity;
  @ApiProperty({ type: Object, description: "Kind specific params" })
  params: object;
  @ApiProperty({ type: Number, nullable: true }) readAt: number | null;
  @ApiProperty() createdAt: number;
}

export class NotificationsPageDto {
  @ApiProperty({ type: [NotificationDto] }) items: NotificationDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor: string | null;
  @ApiProperty() unreadCount: number;
}

export class NotificationPrefsDto {
  @ApiProperty({
    type: Object,
    description: `Category to channel switches, categories: ${Object.values(NotificationCategory).join(", ")}; channels: ${Object.values(NotificationChannel).join(", ")}`,
    example: { tasks: { inbox: true, telegram: false } },
  })
  @IsObject()
  prefs: NotificationPrefs;
}
