"use client";
import { BACKUP_INFO_MODAL_ID } from "@/modules/backups/modals/BackupInfoModal";
import { CREATE_BACKUP_MODAL_ID } from "@/modules/backups/modals/CreateBackupModal";
import { useServerStore } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/PageLayout";
import { PageLoading } from "@/shared/ui/PageLoading";
import { PageTabsHeader } from "@/shared/ui/PageTabsHeader";
import { Archive, Plus } from "lucide-react";
import { useBackups } from "../hooks/useBackups";
import { useBackupsFilters } from "../hooks/useBackupsFilters";
import { BackupInfoModalRegistration } from "../modals/BackupInfoModal";
import { BackupsEmptyState } from "./BackupsEmptyState";
import { BackupsFilters } from "./BackupsFilters";
import { BackupsTable } from "./BackupsTable";

export const Backups = () => {
  const { t } = useTranslation("modules.backups");
  const { openModal } = useModal();
  const { selectedServer } = useServerStore();
  const { backups, isLoading, handleDownload, handleRestore, handleDelete } =
    useBackups();
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredBackups,
  } = useBackupsFilters(backups);

  const handleCreateBackup = () => {
    openModal(CREATE_BACKUP_MODAL_ID);
  };

  const handleViewBackupInfo = (backup: any) => {
    openModal(BACKUP_INFO_MODAL_ID, { backup });
  };

  if (!selectedServer) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>{t("page.noServerSelected")}</p>
      </div>
    );
  }

  return (
    <PageLayout>
      <BlockHeader
        kicker={t("page.header.kicker")}
        title={t("page.header.title")}
        description={t("page.header.description")}
        icon={Archive}
        color="purple"
      />
      <PageTabsHeader
        tabs={
          <BackupsFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        }
        actions={
          <Button onClick={handleCreateBackup} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 sm:mr-2" />
            {t("page.header.createButton")}
          </Button>
        }
      />

      {isLoading ? (
        <PageLoading />
      ) : filteredBackups.length === 0 ? (
        <BackupsEmptyState
          hasFilters={!!searchQuery || statusFilter !== "all"}
          onCreateBackup={handleCreateBackup}
        />
      ) : (
        <BackupsTable
          backups={filteredBackups}
          onDownload={handleDownload}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onInfo={handleViewBackupInfo}
        />
      )}

      <BackupInfoModalRegistration />
    </PageLayout>
  );
};

export default Backups;
