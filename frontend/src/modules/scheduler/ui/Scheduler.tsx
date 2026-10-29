"use client";
import { useServerStore, type Server } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AccessArea } from "@shared/access/areas";
import type { IScheduledTask } from "@shared/types/scheduler.types";
import { CalendarClock, Plus, ScrollText, ServerOff } from "lucide-react";
import { useScheduledTasksByServer, useTaskRunsByServer } from "../api/scheduler.queries";
import { SCHEDULER_TABS, type SchedulerTab } from "../lib/tabs";
import { TASK_FORM_MODAL_ID } from "../modals";
import { RunsPanel } from "./RunsPanel";
import { TasksPanel } from "./TasksPanel";


function ServerScheduler({ server }: { server: Server }) {
  const { t } = useTranslation("modules.scheduler");
  const { openModal } = useModal();
  const [tab, changeTab] = useRouteTab("/scheduler", SCHEDULER_TABS, "tasks");
  const tasks = useScheduledTasksByServer(server.id);
  // Unfiltered runs only feed the counter, the panel keeps its own filtered query
  const runs = useTaskRunsByServer(server.id);
  const canCreate = useAccess([AccessArea.SCHEDULER, "write"], server.id);

  const openForm = (task?: IScheduledTask) => openModal(TASK_FORM_MODAL_ID, { serverId: server.id, editingTask: task ?? null });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreate && (
            <Button onClick={() => openForm()}>
              <Plus />
              {t("create")}
            </Button>
          )
        }
      />
      <Tabs value={tab} onValueChange={(value) => changeTab(value as SchedulerTab)} className="gap-4">
        <TabsList>
          <TabsTrigger value="tasks">
            <CalendarClock />
            {t("tabs.tasks")}
            {tasks.data && <TabsCount>{tasks.data.length}</TabsCount>}
          </TabsTrigger>
          <TabsTrigger value="runs">
            <ScrollText />
            {t("tabs.runs")}
            {runs.data && <TabsCount>{runs.data.total}</TabsCount>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <TasksPanel serverId={server.id} tasks={tasks.data} loading={tasks.isLoading} onEdit={openForm} onCreate={() => openForm()} />
        </TabsContent>
        <TabsContent value="runs">
          <RunsPanel serverId={server.id} tasks={tasks.data ?? []} />
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function Scheduler() {
  const { t } = useTranslation("modules.scheduler");
  const { selectedServer } = useServerStore();

  return (
    <div className="stagger-enter">
      {selectedServer ? (
        // Keyed so filters reset on a server switch
        <ServerScheduler key={selectedServer.id} server={selectedServer} />
      ) : (
        <>
          <PageHeader title={t("title")} description={t("description")} />
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ServerOff />
              </EmptyMedia>
              <EmptyTitle>{t("noServer.title")}</EmptyTitle>
              <EmptyDescription>{t("noServer.description")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </>
      )}
    </div>
  );
}
