"use client";
import { RUN_INFO_MODAL_ID } from "@/modules/scheduler/modals/RunInfoModal";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  useScheduledTasksByServer,
  useTaskRunsByServer,
} from "@/modules/scheduler/api/scheduler.queries";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { ScheduledRunStatus } from "@shared/types/scheduler.types";
import { Filter, History } from "lucide-react";
import { useState } from "react";
import { formatDateTime, formatDuration } from "../utils/formatSchedule";

interface RunsTabProps {
  serverId: string;
}

export const RunsTab = ({ serverId }: RunsTabProps) => {
  const { t } = useTranslation("modules.scheduler");
  const { open } = useModal();

  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const tasksQuery = useScheduledTasksByServer(serverId);
  const runsQuery = useTaskRunsByServer(serverId, {
    taskId: taskFilter === "all" ? undefined : taskFilter,
    status:
      statusFilter === "all" ? undefined : (statusFilter as ScheduledRunStatus),
  });

  const tasks = tasksQuery.data ?? [];
  const taskNameById = new Map(tasks.map((tk) => [tk.id, tk.name]));
  const runs = runsQuery.data?.items ?? [];

  const taskItems = [
    { value: "all", label: t("runs.filters.allTasks") },
    ...tasks.map((task) => ({ value: task.id, label: task.name })),
  ];

  const statusItems = [
    { value: "all", label: t("runs.filters.allStatuses") },
    { value: ScheduledRunStatus.SUCCESS, label: t("runs.statuses.success") },
    { value: ScheduledRunStatus.FAILED, label: t("runs.statuses.failed") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          items={taskItems}
          value={taskFilter}
          onValueChange={(value) => value != null && setTaskFilter(value)}
        >
          <SelectTrigger className="sm:w-[240px]">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t("runs.filters.allTasks")} />
          </SelectTrigger>
          <SelectContent>
            {taskItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={statusItems}
          value={statusFilter}
          onValueChange={(value) => value != null && setStatusFilter(value)}
        >
          <SelectTrigger className="sm:w-[200px]">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t("runs.filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <History className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-4 font-medium">{t("empty.runsTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("empty.runsDescription")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="max-h-[72vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-card">
                  <TableHead className="text-foreground/70">
                    {t("runs.headers.startedAt")}
                  </TableHead>
                  <TableHead className="text-foreground/70">
                    {t("runs.headers.task")}
                  </TableHead>
                  <TableHead className="text-foreground/70">
                    {t("runs.headers.status")}
                  </TableHead>
                  <TableHead className="text-foreground/70">
                    {t("runs.headers.duration")}
                  </TableHead>
                  <TableHead className="text-foreground/70">
                    {t("runs.headers.trigger")}
                  </TableHead>
                  <TableHead className="text-foreground/70">
                    {t("runs.headers.details")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer"
                    onClick={() =>
                      void open(RUN_INFO_MODAL_ID, {
                        run,
                        taskName: taskNameById.get(run.taskId),
                      })
                    }
                  >
                    <TableCell className="text-sm">
                      {formatDateTime(run.startedAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {taskNameById.get(run.taskId) ?? run.taskId}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          run.status === ScheduledRunStatus.SUCCESS
                            ? "default"
                            : "destructive"
                        }
                      >
                        {t(`runs.statuses.${run.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDuration(run.durationMs)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t(`runs.triggers.${run.triggeredBy}`)}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                      {run.error ?? run.output ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
