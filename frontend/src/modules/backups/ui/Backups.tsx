"use client";
import { useServerStore, type Server } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { PageHeader } from "@/shared/ui/page-header";
import { Stat, StatStrip } from "@/shared/ui/stat-strip";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AccessArea } from "@shared/access/areas";
import { BackupStatus } from "@shared/types/backup.types";
import { Archive, CheckCircle2, Database, HardDrive, History, Plus, ServerOff, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useBackupsByServer } from "../api/backups.queries";
import { useBackupTaskSync } from "../hooks/useBackups";
import { BackupInfoModalRegistration } from "../modals/BackupInfoModal";
import { CREATE_BACKUP_MODAL_ID } from "../modals/CreateBackupModal";
import { BACKUP_TABS, type BackupTab } from "../lib/tabs";
import { BackupJournal } from "./BackupJournal";
import { BackupsPanel } from "./BackupsPanel";
import { ServerPolicyPanel } from "./policy/ServerPolicyPanel";

function ServerBackups({ server }: { server: Server }) {
  const { t } = useTranslation("modules.backups");
  const { t: tc } = useTranslation("modules.components");
  const { openModal } = useModal();
  const { data: backups = [], isLoading } = useBackupsByServer(server.id);
  const [tab, changeTab] = useRouteTab("/backups", BACKUP_TABS, "list");
  const progress = useBackupTaskSync(server.id);
  const canCreate = useAccess([AccessArea.BACKUPS, "write"], server.id);

  const summary = useMemo(() => {
    const completed = backups.filter((b) => b.status === BackupStatus.COMPLETED);
    return {
      completed: completed.length,
      size: completed.reduce((sum, b) => sum + b.totalSize, 0),
      last: completed.reduce((latest, b) => Math.max(latest, b.createdAt), 0),
    };
  }, [backups]);

  const create = () => openModal(CREATE_BACKUP_MODAL_ID, { serverId: server.id });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreate && (
            <Button onClick={create}>
              <Plus />
              {t("create")}
            </Button>
          )
        }
      />
      <div className="grid gap-4">
        <StatStrip>
          <Stat label={t("stats.count")} icon={<Database />} tone="blue" value={backups.length} unit={t("stats.successful", summary.completed)} />
          <Stat label={t("stats.size")} icon={<HardDrive />} tone="purple" value={summary.size ? formatBytes(summary.size) : "—"} />
          <Stat
            label={t("stats.last")}
            icon={<CheckCircle2 />}
            tone="green"
            value={summary.last ? formatRelative(summary.last, tc("justNow")) : "—"}
          />
        </StatStrip>
        <Tabs value={tab} onValueChange={(value) => changeTab(value as BackupTab)} className="gap-4">
          <TabsList>
            <TabsTrigger value="list">
              <Archive />
              {t("tabs.list")}
              {!isLoading && <TabsCount>{backups.length}</TabsCount>}
            </TabsTrigger>
            <TabsTrigger value="journal">
              <History />
              {t("tabs.journal")}
            </TabsTrigger>
            <TabsTrigger value="policy">
              <ShieldCheck />
              {t("tabs.policy")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <BackupsPanel serverId={server.id} backups={backups} progress={progress} loading={isLoading} onCreate={canCreate ? create : undefined} />
          </TabsContent>
          <TabsContent value="journal">
            <BackupJournal serverId={server.id} />
          </TabsContent>
          <TabsContent value="policy">
            <ServerPolicyPanel serverId={server.id} />
          </TabsContent>
        </Tabs>
      </div>
      <BackupInfoModalRegistration />
    </>
  );
}

export default function Backups() {
  const { t } = useTranslation("modules.backups");
  const { selectedServer } = useServerStore();

  return (
    <div className="stagger-enter">
      {selectedServer ? (
        // Keyed so filters reset on a server switch
        <ServerBackups key={selectedServer.id} server={selectedServer} />
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
