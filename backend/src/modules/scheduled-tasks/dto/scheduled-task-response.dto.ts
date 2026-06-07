import { ApiProperty } from "@nestjs/swagger";
import {
  ScheduledRunStatus,
  ScheduledRunTrigger,
  ScheduleMode,
  SchedulerActionType,
  type SchedulePayload,
  type SchedulerActionPayload,
} from "@shared/types/scheduler.types";

/** A scheduled task as returned to the panel (with computed nextRunAt) */
export class ScheduledTaskEntity {
  @ApiProperty({ description: "Task id" })
  id: string;

  @ApiProperty({ description: "Target server id" })
  serverId: string;

  @ApiProperty({ description: "Display name" })
  name: string;

  @ApiProperty({ description: "Whether the task is enabled" })
  enabled: boolean;

  @ApiProperty({ enum: ScheduleMode, description: "Schedule mode" })
  mode: ScheduleMode;

  @ApiProperty({
    nullable: true,
    description: "Canonical cron expression (null for ONCE)",
  })
  cronExpression: string | null;

  @ApiProperty({
    nullable: true,
    description: "One-shot run timestamp (ms epoch, null otherwise)",
  })
  runAt: number | null;

  @ApiProperty({ nullable: true, description: "IANA timezone" })
  timezone: string | null;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description: "Original schedule form payload",
  })
  schedulePayload: SchedulePayload;

  @ApiProperty({
    enum: SchedulerActionType,
    description: "Action performed when the task fires",
  })
  action: SchedulerActionType;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description: "Action payload",
  })
  actionPayload: SchedulerActionPayload;

  @ApiProperty({ description: "Owner user id" })
  ownerId: string;

  @ApiProperty({ description: "Creation timestamp (ms epoch)" })
  createdAt: number;

  @ApiProperty({ description: "Last update timestamp (ms epoch)" })
  updatedAt: number;

  @ApiProperty({ nullable: true, description: "Last run timestamp (ms epoch)" })
  lastRunAt: number | null;

  @ApiProperty({
    enum: ScheduledRunStatus,
    nullable: true,
    description: "Last run status",
  })
  lastRunStatus: ScheduledRunStatus.SUCCESS | ScheduledRunStatus.FAILED | null;

  @ApiProperty({ nullable: true, description: "Last run error message" })
  lastRunError: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Computed next run timestamp (ms epoch)",
  })
  nextRunAt?: number | null;
}

/** A historical run of a scheduled task */
export class ScheduledTaskRunEntity {
  @ApiProperty({ description: "Run id" })
  id: string;

  @ApiProperty({ description: "Owning task id" })
  taskId: string;

  @ApiProperty({ description: "Target server id" })
  serverId: string;

  @ApiProperty({ description: "Start timestamp (ms epoch)" })
  startedAt: number;

  @ApiProperty({ nullable: true, description: "Finish timestamp (ms epoch)" })
  finishedAt: number | null;

  @ApiProperty({ nullable: true, description: "Duration in milliseconds" })
  durationMs: number | null;

  @ApiProperty({ enum: ScheduledRunStatus, description: "Run status" })
  status: ScheduledRunStatus;

  @ApiProperty({
    enum: ScheduledRunTrigger,
    description: "What triggered the run",
  })
  triggeredBy: ScheduledRunTrigger;

  @ApiProperty({ nullable: true, description: "Run output" })
  output: string | null;

  @ApiProperty({ nullable: true, description: "Run error message" })
  error: string | null;
}

/** Paginated list of scheduled task runs */
export class ScheduledTaskRunsPageDto {
  @ApiProperty({
    type: [ScheduledTaskRunEntity],
    description: "Runs for the page",
  })
  items: ScheduledTaskRunEntity[];

  @ApiProperty({ description: "Total runs matching the filter" })
  total: number;
}

/** Preview of the next fire times for a cron expression */
export class CronPreviewResponseDto {
  @ApiProperty({
    type: [Number],
    description: "Next run timestamps (ms epoch)",
  })
  nextRuns: number[];
}
