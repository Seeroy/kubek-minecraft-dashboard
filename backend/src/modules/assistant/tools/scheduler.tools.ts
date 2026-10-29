import type { CreateScheduledTaskDto } from "@/modules/scheduled-tasks/dto/scheduled-task.dto";
import { ScheduledTasksService } from "@/modules/scheduled-tasks/scheduled-tasks.service";
import { Injectable } from "@nestjs/common";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import {
  ScheduleMode,
  SchedulerActionType,
  type SchedulerActionPayload,
} from "@shared/types/scheduler.types";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import { json, serverArgs, text } from "./tool-args";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

const ACTIONS = {
  start: SchedulerActionType.SERVER_START,
  stop: SchedulerActionType.SERVER_STOP,
  restart: SchedulerActionType.SERVER_RESTART,
  command: SchedulerActionType.SERVER_COMMAND,
  backup: SchedulerActionType.BACKUP_CREATE,
} as const;

const createArgs = serverArgs({
  name: z.string().min(1).max(120),
  cron: z
    .string()
    .max(120)
    .optional()
    .describe("Cron expression for repeating tasks, like 0 4 * * *"),
  runAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("ISO date time for a one time task"),
  timezone: z.string().max(64).optional().describe("IANA timezone"),
  action: z.enum(["start", "stop", "restart", "command", "backup"]),
  command: z.string().max(1000).optional().describe("For the command action"),
})
  .refine((a) => (a.cron === undefined) !== (a.runAt === undefined), {
    message: "Pass either cron or runAt",
  })
  .refine((a) => a.action !== "command" || !!a.command?.trim(), {
    message: "The command action needs a command",
  });

type CreateArgs = z.infer<typeof createArgs>;

@Injectable()
export class SchedulerTools implements ToolGroup {
  constructor(private readonly scheduler: ScheduledTasksService) {}

  tools(): AssistantTool[] {
    return [this.listTasks(), this.createTask()];
  }

  private listTasks() {
    return defineTool({
      name: "list_scheduled_tasks",
      description: "Scheduled tasks of a server",
      kind: "read",
      access: [AccessArea.SCHEDULER, "read"],
      serverScoped: true,
      args: serverArgs({}),
      run: (_ctx, { serverId }) =>
        Promise.resolve(
          json(
            this.scheduler.findByServerId(serverId).map((t) => ({
              name: t.name,
              enabled: t.enabled,
              cron: t.cronExpression,
              runAt: t.runAt ? new Date(t.runAt).toISOString() : null,
              action: t.actionPayload,
              nextRunAt: t.nextRunAt
                ? new Date(t.nextRunAt).toISOString()
                : null,
              lastRunStatus: t.lastRunStatus,
              lastRunError: t.lastRunError,
            })),
          ),
        ),
    });
  }

  private createTask() {
    return defineTool<CreateArgs>({
      name: "create_scheduled_task",
      description:
        "Schedule a start, stop, restart, console command or backup of a server",
      kind: "write",
      access: [AccessArea.SCHEDULER, "write"],
      serverScoped: true,
      args: createArgs,
      preview: (_ctx, args) =>
        Promise.resolve({
          type: "summary",
          title: `Scheduled task "${args.name}"`,
          lines: [
            args.cron ? `cron: ${args.cron}` : `once: ${args.runAt}`,
            `action: ${args.action}${args.command ? ` ${args.command}` : ""}`,
            ...(args.timezone ? [`timezone: ${args.timezone}`] : []),
          ],
        }),
      run: ({ user }, args) => {
        const task = this.scheduler.create(toDto(args), user);
        const next = task.nextRunAt
          ? new Date(task.nextRunAt).toISOString()
          : "none";
        return Promise.resolve(text(`Created, next run ${next}`));
      },
      audit: ({ name }) => ({
        action: AuditAction.SCHEDULED_TASK_CREATE,
        category: AuditCategory.SERVER,
        resourceName: name,
      }),
    });
  }
}

function toDto(args: CreateArgs): CreateScheduledTaskDto {
  const type = ACTIONS[args.action];
  const action: SchedulerActionPayload =
    type === SchedulerActionType.SERVER_COMMAND
      ? { type, command: args.command!.trim() }
      : type === SchedulerActionType.BACKUP_CREATE
        ? { type, nameTemplate: "scheduled-{{date}}" }
        : { type };
  return {
    name: args.name,
    serverId: args.serverId,
    enabled: true,
    mode: args.cron ? ScheduleMode.CRON : ScheduleMode.ONCE,
    cron: args.cron ? { expression: args.cron } : undefined,
    once: args.runAt ? { isoDateTime: args.runAt } : undefined,
    timezone: args.timezone,
    action,
  };
}
