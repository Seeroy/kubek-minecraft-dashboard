import { Injectable } from "@nestjs/common";
import {
  IScheduledTask,
  ScheduledRunStatus,
  ScheduleMode,
  SchedulePayload,
  SchedulerActionPayload,
  SchedulerActionType,
} from "@shared/types/scheduler.types";
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

@Injectable()
export class ScheduledTasksRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): IScheduledTask[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM scheduled_tasks ORDER BY createdAt DESC")
      .all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findEnabled(): IScheduledTask[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM scheduled_tasks WHERE enabled = 1")
      .all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findByServerId(serverId: string): IScheduledTask[] {
    const rows = this.sqlite.connection
      .query(
        "SELECT * FROM scheduled_tasks WHERE serverId = ? ORDER BY createdAt DESC",
      )
      .all(serverId);
    return rows.map((r: any) => this.deserialize(r));
  }

  findById(id: string): IScheduledTask | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM scheduled_tasks WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  create(task: ScheduledTaskCreate): IScheduledTask {
    const id = randomUUID();
    const now = Date.now();

    this.sqlite.connection
      .prepare(
        `INSERT INTO scheduled_tasks
      (id, serverId, name, enabled, mode, cronExpression, runAt, timezone,
       schedulePayload, action, actionPayload, ownerId, createdAt, updatedAt,
       lastRunAt, lastRunStatus, lastRunError)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)`,
      )
      .run(
        id,
        task.serverId,
        task.name,
        task.enabled ? 1 : 0,
        task.mode,
        task.cronExpression,
        task.runAt,
        task.timezone,
        JSON.stringify(task.schedulePayload),
        task.action,
        JSON.stringify(task.actionPayload),
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
      serverId = ?, name = ?, enabled = ?, mode = ?, cronExpression = ?, runAt = ?,
      timezone = ?, schedulePayload = ?, action = ?, actionPayload = ?,
      ownerId = ?, updatedAt = ?
      WHERE id = ?`,
      )
      .run(
        updated.serverId,
        updated.name,
        updated.enabled ? 1 : 0,
        updated.mode,
        updated.cronExpression,
        updated.runAt,
        updated.timezone,
        JSON.stringify(updated.schedulePayload),
        updated.action,
        JSON.stringify(updated.actionPayload),
        updated.ownerId,
        updated.updatedAt,
        id,
      );

    return this.findById(id);
  }

  setLastRun(
    id: string,
    status: ScheduledRunStatus.SUCCESS | ScheduledRunStatus.FAILED,
    error: string | null,
  ): void {
    this.sqlite.connection
      .prepare(
        "UPDATE scheduled_tasks SET lastRunAt = ?, lastRunStatus = ?, lastRunError = ?, updatedAt = ? WHERE id = ?",
      )
      .run(Date.now(), status, error, Date.now(), id);
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
    return {
      id: String(row.id),
      serverId: String(row.serverId),
      name: String(row.name),
      enabled: !!row.enabled,
      mode: String(row.mode) as ScheduleMode,
      cronExpression: row.cronExpression ?? null,
      runAt:
        row.runAt !== null && row.runAt !== undefined
          ? Number(row.runAt)
          : null,
      timezone: row.timezone ?? null,
      schedulePayload: JSON.parse(row.schedulePayload) as SchedulePayload,
      action: String(row.action) as SchedulerActionType,
      actionPayload: JSON.parse(row.actionPayload) as SchedulerActionPayload,
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
