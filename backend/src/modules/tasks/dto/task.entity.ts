import { TaskErrorCode } from "@/core/errors/error-codes";
import { ApiProperty } from "@nestjs/swagger";
import {
  type TaskStage,
  type TaskStageStatus,
  TaskStatus,
  TaskSteps,
  TaskType,
} from "@shared/types/task.types";

class TaskStageBytesDto {
  @ApiProperty() done: number;
  @ApiProperty() total: number;
}

export class TaskStageDto implements TaskStage {
  @ApiProperty() key: string;
  @ApiProperty({ description: "What the stage does", example: "server" })
  kind: string;
  @ApiProperty({ required: false }) name?: string;
  @ApiProperty({ enum: ["pending", "running", "done", "failed"] })
  status: TaskStageStatus;
  @ApiProperty({ required: false }) progress?: number;
  @ApiProperty({ enum: TaskSteps, required: false }) step?: TaskSteps;
  @ApiProperty({ type: TaskStageBytesDto, required: false })
  bytes?: TaskStageBytesDto;
}

export class TaskEntity {
  @ApiProperty({ description: "Unique task ID", example: "a1b2c3d4" })
  id: string;

  @ApiProperty({ description: "Type of task", enum: TaskType })
  type: TaskType;

  @ApiProperty({ description: "Current status of task", enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ description: "Progress percentage (0-100)", example: 45 })
  progress: number;

  @ApiProperty({
    description: "Optional current step name",
    example: "download_core",
    required: false,
  })
  step?: string;

  @ApiProperty({
    description: "User-friendly message",
    example: "Downloading core...",
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: "Arbitrary metadata object",
    required: false,
    example: { serverId: "srv_001" },
  })
  meta?: Record<string, any>;

  @ApiProperty({ description: "Task result if available", required: false })
  result?: Record<string, unknown>;

  @ApiProperty({
    type: [TaskStageDto],
    required: false,
    description: "Named parts of a long task with their own progress",
  })
  stages?: TaskStageDto[];

  @ApiProperty({
    description: "Error details if task failed",
    required: false,
    example: { code: TaskErrorCode.TASK_ERROR, message: "Download failed" },
  })
  error?: { code: TaskErrorCode | string; message: string };

  @ApiProperty({
    description: "Timestamp of creation (ms)",
    example: 1730143271101,
  })
  createdAt: number;

  @ApiProperty({
    description: "Timestamp of last update (ms)",
    example: 1730143275123,
  })
  updatedAt: number;

  @ApiProperty({
    description: "Owner user ID",
    required: false,
    example: "user_456",
  })
  ownerId?: string;
}
