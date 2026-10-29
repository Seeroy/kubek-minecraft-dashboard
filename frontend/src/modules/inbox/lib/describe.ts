"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { Tone } from "@/shared/ui/tone";
import type { INotification, NotificationParamsMap, NotificationSeverity } from "@shared/types/notification.types";
import { TaskType } from "@shared/types/task.types";
import { ArchiveX, CircleCheck, CloudOff, Info, CircleX, LogIn, type LucideIcon, Power, ServerCrash, ShieldAlert, TriangleAlert } from "lucide-react";
import { useCallback } from "react";

export interface NotificationView {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone: Tone;
  /** Server to open when the row is clicked */
  serverId?: string;
}

const TONES: Record<NotificationSeverity, Tone> = { info: "primary", success: "green", warning: "amber", error: "red" };
const KNOWN_TASKS = new Set<string>(Object.values(TaskType));

type Describe = { [K in keyof NotificationParamsMap]: (params: NotificationParamsMap[K]) => Omit<NotificationView, "tone"> };

/** Turns a stored notification into text in the current language */
export function useDescribeNotification() {
  const { t } = useTranslation("modules.inbox");
  const { t: tRoot } = useTranslation();

  return useCallback(
    (notification: INotification): NotificationView => {
      const taskLabel = (type: string) => t(KNOWN_TASKS.has(type) ? `tasks.${type.replace(".", "_")}` : "tasks.other");
      const errorTitle = (type: string) => tRoot(`modules.diagnostics.errors.${type}.title`);

      const describe: Describe = {
        "task.succeeded": (p) => ({
          title: t("kinds.taskSucceeded", taskLabel(p.taskType)),
          description: p.serverName,
          icon: CircleCheck,
          serverId: p.serverId,
        }),
        "task.failed": (p) => ({
          title: t("kinds.taskFailed", taskLabel(p.taskType)),
          description: [p.serverName, p.error].filter(Boolean).join(": "),
          icon: CircleX,
          serverId: p.serverId,
        }),
        "task.cancelled": (p) => ({ title: t("kinds.taskCancelled", taskLabel(p.taskType)), description: p.serverName, icon: CircleX, serverId: p.serverId }),
        "server.crashed": (p) => ({
          title: t("kinds.serverCrashed", p.serverName),
          description: t("kinds.serverCrashedText"),
          icon: ServerCrash,
          serverId: p.serverId,
        }),
        "server.error": (p) => ({
          title: t("kinds.serverError", p.serverName),
          description: errorTitle(p.errorType),
          icon: TriangleAlert,
          serverId: p.serverId,
        }),
        "server.status": (p) => ({ title: t("kinds.serverStatus", p.serverName, p.status), icon: Power, serverId: p.serverId }),
        "auth.login": (p) => ({ title: t("kinds.login", p.username), description: t("kinds.loginText", p.ip ?? "?"), icon: LogIn }),
        "backup.failed": (p) => ({
          title: t(`kinds.backupFailed.${p.op}`, p.serverName),
          description: [p.backupName, p.error].filter(Boolean).join(": "),
          icon: ArchiveX,
          serverId: p.serverId,
        }),
        "storage.unreachable": (p) => ({ title: t("kinds.storageUnreachable", p.storageName), description: p.error, icon: CloudOff }),
        "auth.locked": (p) => ({
          title: t("kinds.locked"),
          description: t("kinds.lockedText", p.ip ?? "?", Math.ceil(p.retryAfterSec / 60)),
          icon: ShieldAlert,
        }),
      };

      const render = describe[notification.kind] as ((params: unknown) => Omit<NotificationView, "tone">) | undefined;
      // A kind added by a newer panel build still gets a row
      const view = render ? render(notification.params) : { title: notification.kind, icon: Info };
      return { ...view, tone: TONES[notification.severity] };
    },
    [t, tRoot]
  );
}
