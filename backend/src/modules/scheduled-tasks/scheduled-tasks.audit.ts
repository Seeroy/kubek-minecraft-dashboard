import { diffChanges } from "@/modules/audit-log/audit-diff";
import type {
  AuditMeta,
  AuditResolved,
} from "@/modules/audit-log/audit.decorator";
import { AuditCategory } from "@shared/types/audit.types";
import type { IScheduledTask } from "@shared/types/scheduler.types";

// Run bookkeeping changes on its own, only what the user edits is compared
const RUNTIME_FIELDS = [
  "id",
  "serverId",
  "ownerId",
  "createdAt",
  "updatedAt",
  "lastRunAt",
  "lastRunStatus",
  "lastRunError",
  "nextRunAt",
];

/** Audit meta for a scheduler action, handlers note the task they touched */
export const scheduledAudit = (action: string): AuditMeta => ({
  action,
  category: AuditCategory.SERVER,
  resourceType: "scheduled_task",
});

export const taskNote = (
  task: IScheduledTask,
  extra?: AuditResolved,
): AuditResolved => ({
  resourceId: task.id,
  resourceName: task.name,
  serverId: task.serverId,
  ...extra,
});

export const taskChanges = (before: IScheduledTask, after: IScheduledTask) =>
  diffChanges(before, after, { ignore: RUNTIME_FIELDS });
