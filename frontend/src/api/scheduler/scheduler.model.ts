import type { IScheduledTaskRun } from "@shared/types/scheduler.types";
import type { components } from "../types";

export type {
  IScheduledTask,
  IScheduledTaskRun,
  ScheduledRunStatus,
  ScheduleMode,
  SchedulerActionType
} from "@shared/types/scheduler.types";

export type CreateScheduledTaskRequest =
  components["schemas"]["CreateScheduledTaskDto"];
export type UpdateScheduledTaskRequest =
  components["schemas"]["UpdateScheduledTaskDto"];
export type PreviewCronRequest = components["schemas"]["PreviewCronDto"];
export type PreviewCronResponse =
  components["schemas"]["CronPreviewResponseDto"];

export interface RunsListResponse {
  items: IScheduledTaskRun[];
  total: number;
}
