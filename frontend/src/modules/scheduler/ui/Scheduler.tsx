"use client";
import { useServerStore } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/PageLayout";
import { PageTabsHeader } from "@/shared/ui/PageTabsHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type { IScheduledTask } from "@shared/types/scheduler.types";
import { Calendar, History, Plus } from "lucide-react";
import { useState } from "react";
import { RunsTab } from "./RunsTab";
import { TASK_FORM_MODAL_ID } from "./TaskFormDialog";
import { TasksTab } from "./TasksTab";

export const Scheduler = () => {
  const { t } = useTranslation("modules.scheduler");
  const { selectedServer } = useServerStore();
  const { open } = useModal();

  const [tab, setTab] = useState<"tasks" | "runs">("tasks");

  if (!selectedServer) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>{t("page.noServerSelected")}</p>
      </div>
    );
  }

  const openCreate = () => {
    void open(TASK_FORM_MODAL_ID, {
      serverId: selectedServer.id,
      editingTask: null,
    });
  };

  const openEdit = (task: IScheduledTask) => {
    void open(TASK_FORM_MODAL_ID, {
      serverId: selectedServer.id,
      editingTask: task,
    });
  };

  return (
    <PageLayout>
      <BlockHeader
        kicker={t("tabs.tasks")}
        title={t("page.header.title")}
        description={t("page.header.description")}
        icon={Calendar}
        color="blue"
      />
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "tasks" | "runs")}
      >
        <PageTabsHeader
          tabs={
            <TabsList>
              <TabsTrigger value="tasks">
                <Calendar className="h-4 w-4" />
                {t("tabs.tasks")}
              </TabsTrigger>
              <TabsTrigger value="runs">
                <History className="h-4 w-4" />
                {t("tabs.runs")}
              </TabsTrigger>
            </TabsList>
          }
          actions={
            tab === "tasks" && (
              <Button onClick={openCreate} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 sm:mr-2" />
                {t("page.header.createButton")}
              </Button>
            )
          }
        />

        <TabsContent value="tasks" className="mt-6">
          <TasksTab serverId={selectedServer.id} onEdit={openEdit} />
        </TabsContent>
        <TabsContent value="runs" className="mt-6">
          <RunsTab serverId={selectedServer.id} />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default Scheduler;
