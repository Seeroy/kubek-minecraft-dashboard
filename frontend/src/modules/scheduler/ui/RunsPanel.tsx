"use client";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Panel, PanelHead } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { toneClass } from "@/shared/ui/tone";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { ScheduledRunStatus, type IScheduledTask, type IScheduledTaskRun } from "@shared/types/scheduler.types";
import { useMemo, useState } from "react";
import { useTaskRunsByServer } from "../api/scheduler.queries";
import { RUN_INFO_MODAL_ID } from "../modals";
import { actionLook, runBadge, shortDateTime } from "../lib/look";
import { formatRunDuration } from "../lib/schedule";
import { History } from "lucide-react";

const STATUS_FILTERS = ["all", ScheduledRunStatus.SUCCESS, ScheduledRunStatus.FAILED, ScheduledRunStatus.RUNNING] as const;
const ALL = "all";

type StatusFilter = (typeof STATUS_FILTERS)[number];

export function RunsPanel({ serverId, tasks }: { serverId: string; tasks: IScheduledTask[] }) {
  const { t } = useTranslation("modules.scheduler");
  const { openModal } = useModal();
  const [status, setStatus] = useState<StatusFilter>(ALL);
  const [taskId, setTaskId] = useState<string>(ALL);

  const runs = useTaskRunsByServer(serverId, {
    taskId: taskId === ALL ? undefined : taskId,
    status: status === ALL ? undefined : status,
  });
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const items = runs.data?.items ?? [];

  const openRun = (run: IScheduledTaskRun) => openModal(RUN_INFO_MODAL_ID, { run, task: taskById.get(run.taskId) });

  return (
    <Panel>
      <PanelHead className="flex-wrap gap-2 py-2">
        <ToggleGroup variant="segmented" value={[status]} onValueChange={(next) => next[0] && setStatus(next[0] as StatusFilter)}>
          {STATUS_FILTERS.map((key) => (
            <Toggle key={key} variant="segmented" value={key}>
              {key === ALL ? t("runs.allStatuses") : t(`status.${key}`)}
            </Toggle>
          ))}
        </ToggleGroup>
        <Select<string> value={taskId} onValueChange={(value) => value && setTaskId(value)}>
          <SelectTrigger className="ml-auto w-56" aria-label={t("runs.taskFilter")}>
            <SelectValue>{(value: string) => (value === ALL ? t("runs.allTasks") : (taskById.get(value)?.name ?? value))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("runs.allTasks")}</SelectItem>
            {tasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PanelHead>

      {runs.isLoading ? (
        <div className="grid gap-2 p-4">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <History />
            </EmptyMedia>
            <EmptyTitle>{t("runs.empty.title")}</EmptyTitle>
            <EmptyDescription>{t("runs.empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28">{t("runs.headers.time")}</TableHead>
              <TableHead>{t("runs.headers.task")}</TableHead>
              <TableHead className="hidden w-56 @3xl/table:table-cell">{t("runs.headers.action")}</TableHead>
              <TableHead className="w-32">{t("runs.headers.status")}</TableHead>
              <TableHead className="hidden w-28 @2xl/table:table-cell">{t("runs.headers.duration")}</TableHead>
              <TableHead className="hidden w-32 @3xl/table:table-cell">{t("runs.headers.trigger")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((run) => {
              const task = taskById.get(run.taskId);
              const look = task && actionLook[task.action];
              const running = run.status === ScheduledRunStatus.RUNNING;
              return (
                <TableRow
                  key={run.id}
                  tabIndex={0}
                  className="h-12 cursor-pointer"
                  onClick={() => openRun(run)}
                  onKeyDown={(event) => event.key === "Enter" && openRun(run)}
                >
                  <TableCell className="text-muted-foreground tabular-nums">{shortDateTime(run.startedAt)}</TableCell>
                  <TableCell className="truncate font-medium">{task?.name ?? t("runs.deletedTask")}</TableCell>
                  <TableCell className="hidden @3xl/table:table-cell">
                    {task && look && (
                      <span className="flex min-w-0 items-center gap-2">
                        <look.icon className={cn("size-3.5 shrink-0 text-tone", toneClass[look.tone])} />
                        <span className="truncate">{t(`actions.${task.action}`)}</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={runBadge[run.status]}>
                      {running && <Spinner className="size-3" />}
                      {t(`status.${run.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums @2xl/table:table-cell">
                    {running ? "…" : formatRunDuration(run.durationMs, t)}
                  </TableCell>
                  <TableCell className="hidden @3xl/table:table-cell">
                    <Badge variant="secondary">{t(`trigger.${run.triggeredBy}`)}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
