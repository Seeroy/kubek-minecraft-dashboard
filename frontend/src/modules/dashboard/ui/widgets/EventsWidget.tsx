"use client";
import { useAuditLogsQuery } from "@/modules/audit-log/api/audit-log.queries";
import { useActionLabel } from "@/modules/audit-log/lib/format";
import { actionLook } from "@/modules/audit-log/lib/look";
import { useServerStore } from "@/modules/server";
import { useScheduledTasksByServer } from "@/modules/scheduler/api/scheduler.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { useAccess } from "@/shared/lib/access";
import { Plate } from "@/shared/ui/plate";
import type { Tone } from "@/shared/ui/tone";
import { AuditResult } from "@shared/types/audit.types";
import { AccessArea } from "@shared/access/areas";
import { AlertTriangle, CalendarClock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const RECENT_LIMIT = 5;
const SCHEDULED_LIMIT = 3;

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

function EventRow({ icon: Icon, tone, title, detail, time }: { icon: LucideIcon; tone: Tone; title: ReactNode; detail?: ReactNode; time: string }) {
  return (
    <div className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-2.5 text-[13px]">
      <Plate tone={tone} size="sm">
        <Icon />
      </Plate>
      <div className="min-w-0">
        <div className="truncate leading-snug font-medium">{title}</div>
        {detail && <div className="truncate text-xs text-muted-foreground">{detail}</div>}
      </div>
      <time className="pt-0.5 text-[11.5px] whitespace-nowrap text-muted-foreground tabular-nums">{time}</time>
    </div>
  );
}

function Scheduled() {
  const { t } = useTranslation();
  const { selectedServer } = useServerStore();
  const { data: tasks } = useScheduledTasksByServer(selectedServer?.id);

  const upcoming = (tasks ?? [])
    .filter((task) => task.enabled && task.nextRunAt)
    .sort((a, b) => (a.nextRunAt ?? 0) - (b.nextRunAt ?? 0))
    .slice(0, SCHEDULED_LIMIT);

  if (upcoming.length === 0) return null;

  return (
    <section>
      <div className="label-caps px-4 pt-3 pb-1">{t("modules.dashboard.events.scheduled")}</div>
      {upcoming.map((task) => (
        <EventRow
          key={task.id}
          icon={CalendarClock}
          tone="cyan"
          title={task.name}
          detail={t(`modules.scheduler.actions.${task.action}`)}
          time={timeFormat.format(task.nextRunAt!)}
        />
      ))}
    </section>
  );
}

function Recent() {
  const { t } = useTranslation();
  const { data } = useAuditLogsQuery({ limit: RECENT_LIMIT });
  const items = data?.items ?? [];
  const label = useActionLabel();

  if (items.length === 0) return null;

  return (
    <section className="not-first:mt-2 not-first:border-t not-first:border-border">
      <div className="label-caps px-4 pt-3 pb-1">{t("modules.dashboard.events.recent")}</div>
      {items.map((entry) => {
        const failed = entry.result === AuditResult.FAILED;
        const look = actionLook(entry.action, entry.category);
        return (
          <EventRow
            key={entry.id}
            icon={failed ? AlertTriangle : look.icon}
            tone={failed ? "red" : look.tone}
            title={label(entry.action)}
            detail={[entry.resourceName, entry.username].filter(Boolean).join(" · ")}
            time={formatRelative(entry.createdAt, t("modules.dashboard.justNow"))}
          />
        );
      })}
    </section>
  );
}

export default function EventsWidget() {
  const { t } = useTranslation("modules.dashboard.events");
  const { selectedServer } = useServerStore();
  const canSchedule = useAccess([AccessArea.SCHEDULER, "read"], selectedServer?.id);
  const canAudit = useAccess([AccessArea.AUDIT, "read"]);

  return (
    <div className="pb-2">
      {canSchedule && <Scheduled />}
      {canAudit && <Recent />}
      <p className="hidden px-4 py-6 text-center text-[13px] text-muted-foreground only:block">{t("empty")}</p>
    </div>
  );
}
