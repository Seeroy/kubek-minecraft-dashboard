import {
  authHttp,
  buildQueryString,
  type AuthHttpClient,
} from "@/shared/lib/http";
import type { ScheduledRunStatus } from "@shared/types/scheduler.types";
import type {
  CreateScheduledTaskRequest,
  IScheduledTask,
  IScheduledTaskRun,
  PreviewCronRequest,
  PreviewCronResponse,
  RunsListResponse,
  UpdateScheduledTaskRequest,
} from "./scheduler.model";

export class SchedulerApi {
  constructor(private authHttp: AuthHttpClient) {}

  list = (serverId: string): Promise<IScheduledTask[]> =>
    this.authHttp.get<IScheduledTask[]>(`servers/${serverId}/scheduled-tasks`);

  listRuns = (
    serverId: string,
    params?: {
      taskId?: string;
      status?: ScheduledRunStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<RunsListResponse> =>
    this.authHttp.get<RunsListResponse>(
      `servers/${serverId}/scheduled-tasks/runs${buildQueryString(params ?? {})}`
    );

  get = (id: string): Promise<IScheduledTask> =>
    this.authHttp.get<IScheduledTask>(`scheduled-tasks/${id}`);

  create = (
    serverId: string,
    data: CreateScheduledTaskRequest
  ): Promise<IScheduledTask> =>
    this.authHttp.post<IScheduledTask>(`servers/${serverId}/scheduled-tasks`, {
      json: data,
    });

  update = (
    id: string,
    data: UpdateScheduledTaskRequest
  ): Promise<IScheduledTask> =>
    this.authHttp.patch<IScheduledTask>(`scheduled-tasks/${id}`, {
      json: data,
    });

  delete = (id: string): Promise<void> =>
    this.authHttp.delete<void>(`scheduled-tasks/${id}`);

  toggle = (id: string): Promise<IScheduledTask> =>
    this.authHttp.post<IScheduledTask>(`scheduled-tasks/${id}/toggle`);

  runNow = (id: string): Promise<IScheduledTaskRun> =>
    this.authHttp.post<IScheduledTaskRun>(`scheduled-tasks/${id}/run-now`);

  previewCron = (data: PreviewCronRequest): Promise<PreviewCronResponse> =>
    this.authHttp.post<PreviewCronResponse>("scheduled-tasks/preview-cron", {
      json: data,
    });
}

export const schedulerApi = new SchedulerApi(authHttp);
