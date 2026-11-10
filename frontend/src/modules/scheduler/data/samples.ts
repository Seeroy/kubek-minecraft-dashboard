import { ScheduleMode, ScheduledRunStatus, ScheduledRunTrigger, SchedulerActionType, type IScheduledTask, type IScheduledTaskRun, type SchedulerActionPayload } from "@shared/types/scheduler.types";

const task = (i: number, name: string, actionPayload: SchedulerActionPayload): IScheduledTask => ({
  id: `sample-${i}`,
  serverId: "sample",
  name,
  enabled: true,
  mode: ScheduleMode.CRON,
  cronExpression: "0 4 * * *",
  runAt: null,
  timezone: null,
  schedulePayload: { mode: ScheduleMode.CRON, expression: "0 4 * * *" },
  action: actionPayload.type,
  actionPayload,
  ownerId: "sample",
  createdAt: 0,
  updatedAt: 0,
  lastRunAt: 0,
  lastRunStatus: ScheduledRunStatus.SUCCESS,
  lastRunError: null,
  nextRunAt: 0,
});

export const SAMPLE_TASKS: IScheduledTask[] = [
  task(1, "Nightly restart", { type: SchedulerActionType.SERVER_RESTART }),
  task(2, "Daily world backup", { type: SchedulerActionType.BACKUP_CREATE, nameTemplate: "daily-{date}" }),
  task(3, "Broadcast reminder", { type: SchedulerActionType.SERVER_COMMAND, command: "say Vote for the server!" }),
];

const run = (i: number, taskId: string): IScheduledTaskRun => ({
  id: `sample-run-${i}`,
  taskId,
  serverId: "sample",
  startedAt: 0,
  finishedAt: 0,
  durationMs: 1_200,
  status: ScheduledRunStatus.SUCCESS,
  triggeredBy: ScheduledRunTrigger.CRON,
  output: null,
  error: null,
});

export const SAMPLE_RUNS: IScheduledTaskRun[] = [run(1, "sample-1"), run(2, "sample-2"), run(3, "sample-3"), run(4, "sample-1")];
