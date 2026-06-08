import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { TaskEntity } from "./tasks.model";

export class TasksApi {
  constructor(private authHttp: AuthHttpClient) {}

  getAll = (): Promise<TaskEntity[]> =>
    this.authHttp.get<TaskEntity[]>("tasks");

  getOne = (id: string): Promise<TaskEntity> =>
    this.authHttp.get<TaskEntity>(`tasks/${id}`);
}

export const tasksApi = new TasksApi(authHttp);
