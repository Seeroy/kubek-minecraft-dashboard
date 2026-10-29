import type { AuditMeta } from "@/modules/audit-log/audit.decorator";
import { AuditCategory } from "@shared/types/audit.types";

/** Audit meta for a mod or plugin change, the task knows the project title */
export const contentAudit = (
  action: string,
  resourceType: "mod" | "plugin",
): AuditMeta => ({
  action,
  category: AuditCategory.SERVER,
  resourceType,
  resolve: ({ task }) => ({
    resourceId: task?.meta?.pluginId,
    resourceName: task?.meta?.pluginName,
    details: { version: task?.meta?.versionName },
  }),
  resolveError: ({ req }) => ({ resourceId: req.body?.projectId }),
});
