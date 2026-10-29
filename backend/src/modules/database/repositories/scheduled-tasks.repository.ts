import { Injectable } from "@nestjs/common";
import {
  IScheduledTask,
  ScheduledRunStatus,
  ScheduleMode,
  SchedulePayload,
  SchedulerActionPayload,
  SchedulerActionType,
} from "@shared/types/scheduler.types";
import { scheduleCron, scheduleRunAt } from "@/core/utils/schedule";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../sqlite.provider";

export type ScheduledTaskCreate = Omit<
  IScheduledTask,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "lastRunAt"
  | "lastRunStatus"
  | "lastRunError"
  | "nextRunAt"
>;

// Last run is taken from the runs table, it is not stored on the task
const SELECT_TASK = `SELECT t.*,
    r.finishedAt AS lastRunAt, r.status AS lastRunStatus, r.error AS lastRunError
  FROM scheduled_tasks t
  LEFT JOIN scheduled_task_runs r ON r.id = (
    SELECT id FROM scheduled_task_runs
     WHERE taskId = t.id AND status IN ('${ScheduledRunStatus.SUCCESS}', '${ScheduledRunStatus.FAILED}')
     ORDER BY startedAt DESC LIMIT 1
  )`;

// mode and type have their own columns, no need to keep them in the payload
function withoutKey<T extends object>(payload: T, key: string): string {
  const rest = { ...(payload as Record<string, unknown>) };
  delete rest[key];
  return JSON.stringify(rest);
}

@Injectable()
export class ScheduledTasksRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): IScheduledTask[] {
    const rows = this.sqlite.connection
      .query(`${SELECT_TASK} ORDER BY t.createdAt DESC`)
      .all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findEnabled(): IScheduledTask[] {
    const rows = this.sqlite.connection
      .query(`${SELECT_TASK} WHERE t.enabled = 1`)
      .all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findByServerId(serverId: string): IScheduledTask[] {
    const rows = this.sqlite.connection
      .query(`${SELECT_TASK} WHERE t.serverId = ? ORDER BY t.createdAt DESC`)
      .all(serverId);
    return rows.map((r: any) => this.deserialize(r));
  }

  findById(id: string): IScheduledTask | null {
    const row = this.sqlite.connection
      .query(`${SELECT_TASK} WHERE t.id = ?`)
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  create(task: ScheduledTaskCreate): IScheduledTask {
    const id = randomUUID();
    const now = Date.now();

    this.sqlite.connection
      .prepare(
        `INSERT INTO scheduled_tasks
      (id, serverId, name, enabled, mode, timezone,
       schedulePayload, action, actionPayload, ownerId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        task.serverId,
        task.name,
        task.enabled ? 1 : 0,
        task.mode,
        task.timezone,
        withoutKey(task.schedulePayload, "mode"),
        task.action,
        withoutKey(task.actionPayload, "type"),
        task.ownerId,
        now,
        now,
      );

    return this.findById(id)!;
  }

  update(id: string, updates: Partial<IScheduledTask>): IScheduledTask | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updated: IScheduledTask = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    this.sqlite.connection
      .prepare(
        `UPDATE scheduled_tasks SET
      serverId = ?, name = ?, enabled = ?, mode = ?,
      timezone = ?, schedulePayload = ?, action = ?, actionPayload = ?,
      ownerId = ?, updatedAt = ?
      WHERE id = ?`,
      )
      .run(
        updated.serverId,
        updated.name,
        updated.enabled ? 1 : 0,
        updated.mode,
        updated.timezone,
        withoutKey(updated.schedulePayload, "mode"),
        updated.action,
        withoutKey(updated.actionPayload, "type"),
        updated.ownerId,
        updated.updatedAt,
        id,
      );

    return this.findById(id);
  }

  delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) return false;
    this.sqlite.connection
      .prepare("DELETE FROM scheduled_tasks WHERE id = ?")
      .run(id);
    return true;
  }

  private deserialize(row: any): IScheduledTask {
    const mode = String(row.mode) as ScheduleMode;
    const action = String(row.action) as SchedulerActionType;
    const schedulePayload = {
      ...JSON.parse(row.schedulePayload),
      mode,
    } as SchedulePayload;
    return {
      id: String(row.id),
      serverId: String(row.serverId),
      name: String(row.name),
      enabled: !!row.enabled,
      mode,
      cronExpression: scheduleCron(schedulePayload),
      runAt: scheduleRunAt(schedulePayload),
      timezone: row.timezone ?? null,
      schedulePayload,
      action,
      actionPayload: {
        ...JSON.parse(row.actionPayload),
        type: action,
      } as SchedulerActionPayload,
      ownerId: String(row.ownerId),
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
      lastRunAt:
        row.lastRunAt !== null && row.lastRunAt !== undefined
          ? Number(row.lastRunAt)
          : null,
      lastRunStatus:
        (row.lastRunStatus as IScheduledTask["lastRunStatus"]) ?? null,
      lastRunError: row.lastRunError ?? null,
    };
  }
}
