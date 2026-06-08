"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { emitToast } from "@/shared/lib/toast-bus";
import { confirmDialog } from "@/shared/modals";
import {
  useDeleteScheduledTaskMutation,
  useRunNowMutation,
  useScheduledTasksByServer,
  useToggleScheduledTaskMutation,
} from "@/modules/scheduler/api/scheduler.queries";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { IScheduledTask } from "@shared/types/scheduler.types";
import { ScheduledRunStatus } from "@shared/types/scheduler.types";
import { CalendarClock, Pencil, Play, Trash2 } from "lucide-react";
import { formatDateTime, formatSchedule } from "../utils/formatSchedule";

interface TasksTabProps {
  serverId: string;
  onEdit: (task: IScheduledTask) => void;
}

export const TasksTab = ({ serverId, onEdit }: TasksTabProps) => {
  const { t } = useTranslation("modules.scheduler");
  const tasksQuery = useScheduledTasksByServer(serverId);
  const deleteMutation = useDeleteScheduledTaskMutation(serverId);
  const toggleMutation = useToggleScheduledTaskMutation(serverId);
  const runNowMutation = useRunNowMutation(serverId);

  const tasks = tasksQuery.data ?? [];

  if (tasksQuery.isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t("page.loading")}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p className="mt-4 font-medium">{t("empty.tasksTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("empty.tasksDescription")}
        </p>
      </div>
    );
  }

  const handleDelete = async (task: IScheduledTask) => {
    const ok = await confirmDialog({
      title: t("confirmDelete.title"),
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(task.id);
      emitToast({
        title: t("toasts.deleted"),
        type: "success",
        duration: 3000,
      });
    } catch (e: any) {
      emitToast({
        title: t("toasts.error"),
        message: e?.message,
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleToggle = async (task: IScheduledTask) => {
    try {
      await toggleMutation.mutateAsync(task.id);
      emitToast({
        title: t("toasts.toggled"),
        type: "success",
        duration: 2500,
      });
    } catch (e: any) {
      emitToast({
        title: t("toasts.error"),
        message: e?.message,
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleRunNow = async (task: IScheduledTask) => {
    try {
      await runNowMutation.mutateAsync(task.id);
      emitToast({ title: t("toasts.ranNow"), type: "success", duration: 3000 });
    } catch (e: any) {
      emitToast({
        title: t("toasts.error"),
        message: e?.message,
        type: "error",
        duration: 5000,
      });
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="max-h-[72vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-card">
              <TableHead className="text-foreground/70">
                {t("table.headers.name")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.action")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.schedule")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.nextRun")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.lastRun")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.enabled")}
              </TableHead>
              <TableHead className="w-[180px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {t(`form.actions.${task.action}`)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatSchedule(task, t)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(task.nextRunAt)}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">
                      {formatDateTime(task.lastRunAt)}
                    </span>
                    {task.lastRunStatus && (
                      <Badge
                        variant={
                          task.lastRunStatus === ScheduledRunStatus.SUCCESS
                            ? "default"
                            : "destructive"
                        }
                        className="w-fit text-[10px]"
                      >
                        {t(`runs.statuses.${task.lastRunStatus}`)}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={task.enabled}
                    onCheckedChange={() => handleToggle(task)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRunNow(task)}
                      title={t("table.actions.runNow")}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(task)}
                      title={t("table.actions.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(task)}
                      title={t("table.actions.delete")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
