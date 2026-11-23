"use client";
import { useStreamerMask } from "@/shared/hooks/useStreamerMode";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { Tone } from "@/shared/ui/tone";
import type { INotification, NotificationParamsMap, NotificationSeverity, TaskNotificationParams } from "@shared/types/notification.types";
import { TaskType } from "@shared/types/task.types";
import { ArchiveX, CircleArrowUp, PackageCheck, CircleCheck, CloudOff, Gauge, Info, CircleX, LogIn, type LucideIcon, Power, ServerCrash, ShieldAlert, TriangleAlert } from "lucide-react";
import { useCallback } from "react";

export interface NotificationView {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone: Tone;
  /** Server to open when the row is clicked */
  serverId?: string;
  /** Page to open, after selecting the server when there is one */
  href?: string;
  /** Outside page offered as a toast button */
  link?: { label: string; url: string };
}

const TONES: Record<NotificationSeverity, Tone> = { info: "primary", success: "green", warning: "amber", error: "red" };
const KNOWN_TASKS = new Set<string>(Object.values(TaskType));

type Describe = { [K in keyof NotificationParamsMap]: (params: NotificationParamsMap[K]) => Omit<NotificationView, "tone"> };

/** Turns a stored notification into text in the current language */
export function useDescribeNotification() {
  const { t } = useTranslation("modules.inbox");
  const { t: tRoot } = useTranslation();
  const mask = useStreamerMask();

  return useCallback(
    (notification: INotification): NotificationView => {
      // Extension tasks bring their own title or type, the exact fields depend on the backend
      const taskLabel = (p: TaskNotificationParams) => {
        const extra = p as TaskNotificationParams & { title?: string; taskTitle?: string; extType?: string; meta?: { title?: string; type?: string } };
        const own = extra.taskTitle || extra.title || extra.meta?.title;
        if (own) return own;
        const known = KNOWN_TASKS.has(p.taskType) ? t(`tasks.${p.taskType.replace(".", "_")}`) : null;
        if (known && !known.startsWith("NOT TRANSLATED")) return known;
        return extra.extType || extra.meta?.type || t("tasks.other");
      };
      const errorTitle = (type: string) => tRoot(`modules.diagnostics.errors.${type}.title`);

      const describe: Describe = {
        "task.succeeded": (p) => ({
          title: t("kinds.taskSucceeded", taskLabel(p)),
          description: p.serverName,
          icon: CircleCheck,
          serverId: p.serverId,
        }),
        "task.failed": (p) => ({
          title: t("kinds.taskFailed", taskLabel(p)),
          description: [p.serverName, p.error].filter(Boolean).join(": "),
          icon: CircleX,
          serverId: p.serverId,
        }),
        "task.cancelled": (p) => ({ title: t("kinds.taskCancelled", taskLabel(p)), description: p.serverName, icon: CircleX, serverId: p.serverId }),
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
        "server.low_tps": (p) => ({
          title: t("kinds.lowTps", p.serverName),
          description: t("kinds.lowTpsText", p.tps.toFixed(1)),
          icon: Gauge,
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
        "panel.update_available": (p) => ({
          title: t("kinds.updateAvailable", p.version),
          description: t("kinds.updateAvailableText", p.currentVersion),
          icon: CircleArrowUp,
          href: "/panel-settings/about",
          link: { label: t("kinds.openRelease"), url: p.url },
        }),
        "content.updates_available": (p) => {
          const rest = p.count - p.names.length;
          const names = p.names.join(", ");
          return {
            title: t(`kinds.contentUpdates.${p.kind}`, p.serverName, p.count),
            description: rest > 0 ? t("kinds.contentUpdates.more", names, rest) : names || undefined,
            icon: PackageCheck,
            serverId: p.serverId,
            href: p.kind === "mods" ? "/mods" : "/plugins",
          };
        },
      };

      const render = describe[notification.kind] as ((params: unknown) => Omit<NotificationView, "tone">) | undefined;
      // A kind added by a newer panel build still gets a row
      const view = render ? render(notification.params) : { title: notification.kind, icon: Info };
      // Sign-in IPs and error texts end up in toasts too
      const description = view.description && mask.text(view.description);
      return { ...view, title: mask.text(view.title), description, tone: TONES[notification.severity] };
    },
    [t, tRoot, mask]
  );
}
