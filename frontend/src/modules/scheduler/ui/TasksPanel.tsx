"use client";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { cn } from "@/shared/lib/cn";
import { formatRelative } from "@/shared/lib/formatRelative";
import { confirmDialog } from "@/shared/modals";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Panel } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Switch } from "@/shared/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AccessArea } from "@shared/access/areas";
import { ScheduleMode, ScheduledRunStatus, SchedulerActionType, type IScheduledTask } from "@shared/types/scheduler.types";
import { CalendarClock, Pencil, Play, Plus, Trash2 } from "lucide-react";
import {
  useDeleteScheduledTaskMutation,
  useRunNowMutation,
  useToggleScheduledTaskMutation,
} from "../api/scheduler.queries";
import { actionLook, shortDateTime } from "../lib/look";
import { describeSchedule } from "../lib/schedule";

interface TasksPanelProps {
  serverId: string;
  tasks: IScheduledTask[] | undefined;
  loading: boolean;
  onEdit: (task: IScheduledTask) => void;
  onCreate: () => void;
}

function actionDetail(task: IScheduledTask, label: string) {
  const action = task.actionPayload;
  if (action.type === SchedulerActionType.SERVER_COMMAND) return action.command;
  if (action.type === SchedulerActionType.BACKUP_CREATE) return action.nameTemplate;
  if (action.type === SchedulerActionType.HTTP_WEBHOOK) return `${action.method} ${action.url}`;
  return label;
}

const monoDetail = new Set([SchedulerActionType.SERVER_COMMAND, SchedulerActionType.HTTP_WEBHOOK]);

export function TasksPanel({ serverId, tasks = [], loading, onEdit, onCreate }: TasksPanelProps) {
  const { t } = useTranslation("modules.scheduler");
  const { t: tc } = useTranslation("modules.components");
  const { notify } = useNotifications();
  const removeMutation = useDeleteScheduledTaskMutation(serverId);
  const toggleMutation = useToggleScheduledTaskMutation(serverId);
  const runMutation = useRunNowMutation(serverId);
  const canWrite = useAccess([AccessArea.SCHEDULER, "write"], serverId);
  const canDelete = useAccess([AccessArea.SCHEDULER, "manage"], serverId);

  const relative = (timestamp: number) => formatRelative(timestamp, tc("justNow"));

  const runNow = (task: IScheduledTask) => {
    notify({ type: "info", title: t("toasts.started", task.name) });
    runMutation.mutate(task.id);
  };

  const toggle = async (task: IScheduledTask) => {
    await toggleMutation.mutateAsync(task.id);
    notify({ type: "info", title: t(task.enabled ? "toasts.disabled" : "toasts.enabled", task.name) });
  };

  const remove = async (task: IScheduledTask) => {
    const ok = await confirmDialog({
      title: t("confirmDelete.title", task.name),
      description: t("confirmDelete.description"),
      confirmText: t("confirmDelete.confirm"),
      cancelText: t("confirmDelete.cancel"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    await removeMutation.mutateAsync(task.id);
    notify({ type: "success", title: t("toasts.deleted") });
  };

  if (loading) return <Skeleton className="h-72 rounded-lg" />;

  if (tasks.length === 0) {
    return (
      <Empty className="rounded-lg border border-border bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarClock />
          </EmptyMedia>
          <EmptyTitle>{t("tasks.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("tasks.empty.description")}</EmptyDescription>
        </EmptyHeader>
        {canWrite && (
          <EmptyContent>
            <Button onClick={onCreate}>
              <Plus />
              {t("create")}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <Panel>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("headers.name")}</TableHead>
            <TableHead className="hidden w-52 @3xl/table:table-cell">{t("headers.schedule")}</TableHead>
            <TableHead className="hidden w-36 @3xl/table:table-cell">{t("headers.nextRun")}</TableHead>
            <TableHead className="hidden w-36 @4xl/table:table-cell">{t("headers.lastRun")}</TableHead>
            <TableHead className="w-16">{t("headers.enabled")}</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const { icon: Icon, tone } = actionLook[task.action];
            const label = t(`actions.${task.action}`);
            const succeeded = task.lastRunStatus === ScheduledRunStatus.SUCCESS;
            return (
              <TableRow key={task.id} className={cn("h-[60px] transition-opacity", !task.enabled && "opacity-55 hover:opacity-85")}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <Plate tone={tone} title={label}>
                      <Icon />
                    </Plate>
                    <div className="min-w-0">
                      <b className="block truncate font-semibold">{task.name}</b>
                      <span className={cn("block truncate text-xs text-muted-foreground", monoDetail.has(task.action) && "font-mono text-[11.5px]")}>
                        {actionDetail(task, label)}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden @3xl/table:table-cell">
                  <span className="block truncate font-medium">{describeSchedule(task.schedulePayload, t)}</span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">
                    {task.mode === ScheduleMode.CRON && task.cronExpression && <span className="font-mono">{task.cronExpression} · </span>}
                    {task.mode !== ScheduleMode.ONCE && (task.timezone ?? t("tasks.serverTime"))}
                  </span>
                </TableCell>
                <TableCell className="hidden @3xl/table:table-cell">
                  {task.enabled && task.nextRunAt ? (
                    <>
                      <span className="block font-medium tabular-nums">{shortDateTime(task.nextRunAt)}</span>
                      <span className="block text-xs text-muted-foreground">{relative(task.nextRunAt)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden @4xl/table:table-cell">
                  {task.lastRunAt && task.lastRunStatus ? (
                    <>
                      <span className="flex items-center gap-1.5" title={task.lastRunError ?? undefined}>
                        <i className={cn("size-2 rounded-full", succeeded ? "bg-success" : "bg-danger")} />
                        {t(`status.${task.lastRunStatus}`)}
                      </span>
                      <span className="block text-xs text-muted-foreground">{relative(task.lastRunAt)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{t("tasks.neverRan")}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={task.enabled}
                    disabled={!canWrite || toggleMutation.isPending}
                    onCheckedChange={() => void toggle(task)}
                    aria-label={t("tasks.toggle")}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-0.5">
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-success hover:text-success"
                          title={t("tasks.runNow")}
                          aria-label={t("tasks.runNow")}
                          onClick={() => runNow(task)}
                        >
                          <Play />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title={t("tasks.edit")} aria-label={t("tasks.edit")} onClick={() => onEdit(task)}>
                          <Pencil />
                        </Button>
                      </>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="hover:bg-danger/10 hover:text-danger"
                        title={t("tasks.delete")}
                        aria-label={t("tasks.delete")}
                        onClick={() => void remove(task)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}
