import { TaskErrorCode } from "@/core/errors/error-codes";
import { ApiProperty } from "@nestjs/swagger";
import { TaskStatus, TaskType } from "@shared/types/task.types";

export class TaskEntity {
  @ApiProperty({ description: "Unique task ID", example: "a1b2c3d4" })
  id: string;

  @ApiProperty({ description: "Type of task", enum: TaskType })
  type: TaskType;

  @ApiProperty({ description: "Current status of task", enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ description: "Progress percentage (0–100)", example: 45 })
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
