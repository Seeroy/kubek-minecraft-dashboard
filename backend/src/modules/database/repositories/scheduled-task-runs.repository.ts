import { Injectable } from "@nestjs/common";
import {
  IScheduledTaskRun,
  ScheduledRunStatus,
  ScheduledRunTrigger,
} from "@shared/types/scheduler.types";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../sqlite.provider";

// serverId comes back with the run but is stored only on its task
export type RunCreateInput = Omit<IScheduledTaskRun, "id">;

const SELECT_RUN = `SELECT r.*, t.serverId AS serverId FROM scheduled_task_runs r
  JOIN scheduled_tasks t ON t.id = r.taskId`;

export interface RunsListQuery {
  taskId?: string;
  status?: ScheduledRunStatus;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ScheduledTaskRunsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  create(input: RunCreateInput): IScheduledTaskRun {
    const id = randomUUID();
    this.sqlite.connection
      .prepare(
        `INSERT INTO scheduled_task_runs
      (id, taskId, startedAt, finishedAt, durationMs, status, triggeredBy, output, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.taskId,
        input.startedAt,
        input.finishedAt,
        input.durationMs,
        input.status,
        input.triggeredBy,
        input.output,
        input.error,
      );
    return { id, ...input };
  }

  findById(id: string): IScheduledTaskRun | null {
    const row = this.sqlite.connection
      .query(`${SELECT_RUN} WHERE r.id = ?`)
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByTaskId(
    taskId: string,
    opts: { limit?: number; offset?: number } = {},
  ): IScheduledTaskRun[] {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
    const offset = Math.max(opts.offset ?? 0, 0);
    const rows = this.sqlite.connection
      .query(
        `${SELECT_RUN} WHERE r.taskId = ? ORDER BY r.startedAt DESC LIMIT ? OFFSET ?`,
      )
      .all(taskId, limit, offset);
    return rows.map((r: any) => this.deserialize(r));
  }

  findByServerId(
    serverId: string,
    query: RunsListQuery = {},
  ): IScheduledTaskRun[] {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 500);
    const offset = Math.max(query.offset ?? 0, 0);

    const where: string[] = ["t.serverId = ?"];
    const params: any[] = [serverId];

    if (query.taskId) {
      where.push("r.taskId = ?");
      params.push(query.taskId);
    }

    if (query.status) {
      where.push("r.status = ?");
      params.push(query.status);
    }

    const sql = `${SELECT_RUN} WHERE ${where.join(" AND ")} ORDER BY r.startedAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = this.sqlite.connection.query(sql).all(...params);
    return rows.map((r: any) => this.deserialize(r));
  }

  countByServerId(serverId: string, query: RunsListQuery = {}): number {
    const where: string[] = ["t.serverId = ?"];
    const params: any[] = [serverId];
    if (query.taskId) {
      where.push("r.taskId = ?");
      params.push(query.taskId);
    }
    if (query.status) {
      where.push("r.status = ?");
      params.push(query.status);
    }
    const row = this.sqlite.connection
      .query(
        `SELECT COUNT(*) as c FROM scheduled_task_runs r JOIN scheduled_tasks t ON t.id = r.taskId WHERE ${where.join(" AND ")}`,
      )
      .get(...params) as any;
    return Number(row?.c ?? 0);
  }

  // Keep only the most recent keep runs for the given task; delete the rest
  pruneOlderThan(taskId: string, keep: number): number {
    const result = this.sqlite.connection
      .prepare(
        `DELETE FROM scheduled_task_runs
                WHERE taskId = ?
                  AND id NOT IN (
                    SELECT id FROM scheduled_task_runs
                    WHERE taskId = ?
                    ORDER BY startedAt DESC
                    LIMIT ?
                  )`,
      )
      .run(taskId, taskId, keep);
    return Number((result as any).changes ?? 0);
  }

  private deserialize(row: any): IScheduledTaskRun {
    return {
      id: String(row.id),
      taskId: String(row.taskId),
      serverId: String(row.serverId),
      startedAt: Number(row.startedAt),
      finishedAt:
        row.finishedAt !== null && row.finishedAt !== undefined
          ? Number(row.finishedAt)
          : null,
      durationMs:
        row.durationMs !== null && row.durationMs !== undefined
          ? Number(row.durationMs)
          : null,
      status: String(row.status) as ScheduledRunStatus,
      triggeredBy: String(row.triggeredBy) as ScheduledRunTrigger,
      output: row.output ?? null,
      error: row.error ?? null,
    };
  }
}
