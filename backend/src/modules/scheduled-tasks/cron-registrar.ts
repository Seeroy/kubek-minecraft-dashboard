import { Injectable } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import {
  type IScheduledTask,
  ScheduleMode,
  ScheduledRunTrigger,
} from "@shared/types/scheduler.types";
import { CronJob } from "cron";

const JOB_PREFIX = "scheduled-task:";

export interface CronHandlers {
  fire: (task: IScheduledTask, trigger: ScheduledRunTrigger) => void;
  /** One-shot task already fired, its job is gone */
  onceFired: (task: IScheduledTask) => void;
}

/**
 * One cron job per enabled task in the Nest registry
 */
@Injectable()
export class CronRegistrar {
  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  register(task: IScheduledTask, handlers: CronHandlers): void {
    const name = this.jobName(task.id);

    if (task.mode === ScheduleMode.ONCE) {
      if (!task.runAt) return;
      const date = new Date(task.runAt);
      if (date.getTime() <= Date.now()) return; // missed; will be ignored on bootstrap
      const job = new CronJob(
        date,
        () => {
          handlers.fire(task, ScheduledRunTrigger.ONCE);
          // Disable after firing so it doesn't linger and so listEnabled excludes it
          handlers.onceFired(task);
          this.unregister(task.id);
        },
        null,
        false,
        task.timezone || undefined,
      );
      this.schedulerRegistry.addCronJob(name, job);
      job.start();
      return;
    }

    if (!task.cronExpression) return;
    const job = new CronJob(
      task.cronExpression,
      () => handlers.fire(task, ScheduledRunTrigger.CRON),
      null,
      false,
      task.timezone || undefined,
    );
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  unregister(taskId: string): void {
    try {
      this.schedulerRegistry.deleteCronJob(this.jobName(taskId));
    } catch {
      // ignore - not registered
    }
  }

  unregisterAll(): void {
    for (const name of Array.from(
      this.schedulerRegistry.getCronJobs().keys(),
    )) {
      if (name.startsWith(JOB_PREFIX)) {
        try {
          this.schedulerRegistry.deleteCronJob(name);
        } catch {
          // ignore
        }
      }
    }
  }

  private jobName(taskId: string): string {
    return `${JOB_PREFIX}${taskId}`;
  }
}
