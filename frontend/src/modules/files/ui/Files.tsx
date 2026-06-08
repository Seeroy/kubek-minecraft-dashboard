"use client";
import { useBatchFileOperations } from "@/modules/files/hooks/useBatchFileOperations";
import { useFileOperations } from "@/modules/files/hooks/useFileOperations";
import { useFilesData } from "@/modules/files/hooks/useFilesData";
import { useFilesDropUpload } from "@/modules/files/hooks/useFilesDropUpload";
import { useFilesNavigation } from "@/modules/files/hooks/useFilesNavigation";
import { useFilesSelection } from "@/modules/files/hooks/useFilesSelection";
import { useFilesSelectionActions } from "@/modules/files/hooks/useFilesSelectionActions";
import FilesBreadcrumb from "@/modules/files/ui/FilesBreadcrumb";
import FilesDropzoneOverlay from "@/modules/files/ui/FilesDropzoneOverlay";
import FilesHint from "@/modules/files/ui/FilesHint";
import FilesList from "@/modules/files/ui/FilesList";
import FilesSelectionToolbar from "@/modules/files/ui/FilesSelectionToolbar";
import FilesToolbar from "@/modules/files/ui/FilesToolbar";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { PageLayout } from "@/shared/ui/PageLayout";
import { PageLoading } from "@/shared/ui/PageLoading";
import type { IFile } from "@shared/types/file.types";
import { FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

const Files = () => {
  const { t } = useTranslation("modules.files");
  const { selectedServer } = useServerStore();
  const router = useRouter();

  // Gzipped logs can't be edited inline -> open in log viewer
  const handleOpenLogFile = useCallback(
    (file: IFile) => {
      router.push(`/logs?file=${encodeURIComponent(file.name)}`);
    },
    [router]
  );

  const { currentPath, breadcrumbParts, navigateToPath, navigateUp } =
    useFilesNavigation();
  const { files, isInitialLoading, loadFiles } = useFilesData({
    serverId: selectedServer?.id,
    currentPath,
  });

  const selection = useFilesSelection();
  useEffect(() => {
    selection.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServer?.id, currentPath]);
  const selectionActions = useFilesSelectionActions(selection);

  const batchOps = useBatchFileOperations({
    selectedServer,
    currentPath,
    selection,
    loadFiles,
  });
  const fileOps = useFileOperations({
    selectedServer,
    currentPath,
    loadFiles,
    navigateToPath,
    extractArchiveMutation: batchOps.extractArchiveMutation,
    extractRunner: batchOps.extractRunner,
  });

  const dropUpload = useFilesDropUpload({
    serverId: selectedServer?.id,
    currentPath,
    onComplete: loadFiles,
  });

  if (!selectedServer) {
    return (
      <PageLayout>
        <BlockHeader
          kicker={t("header.title")}
          title={t("header.title")}
          description={t("header.description")}
          icon={FolderOpen}
          color="yellow"
        />
        <div className="py-12 text-center text-muted-foreground">
          <p>{t("ui.files.noServerSelected")}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <BlockHeader
        kicker={t("header.title")}
        title={t("header.title")}
        description={t("header.description")}
        icon={FolderOpen}
        color="yellow"
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilesBreadcrumb
          serverName={selectedServer.name}
          breadcrumbParts={breadcrumbParts}
          onNavigate={navigateToPath}
        />
        <div className="flex items-center gap-2">
          <FilesToolbar
            currentPath={currentPath}
            onUpload={fileOps.handleFileUpload}
            onCreated={loadFiles}
            uploadDisabled={isInitialLoading || fileOps.isMutating}
            t={t}
          />
          <FilesHint />
        </div>
      </div>

      <div
        className="relative"
        onDragEnter={dropUpload.handleDragEnter}
        onDragLeave={dropUpload.handleDragLeave}
        onDragOver={dropUpload.handleDragOver}
        onDrop={dropUpload.handleDrop}
      >
        {selection.count > 0 && (
          <FilesSelectionToolbar
            count={selection.count}
            onClear={() => selection.clear()}
            onDelete={batchOps.handleBatchDelete}
            onArchive={batchOps.handleOpenArchiveModal}
            isBusy={batchOps.isBatchBusy}
            progress={batchOps.activeRunner?.progress ?? null}
            progressLabel={batchOps.activeRunner?.message ?? null}
          />
        )}

        {isInitialLoading ? (
          <PageLoading />
        ) : (
          <div className={selection.count > 0 ? "mt-3" : ""}>
            <FilesList
              files={files}
              currentPath={currentPath}
              serverId={selectedServer.id}
              onEdit={fileOps.handleEditFile}
              onNavigate={navigateToPath}
              onNavigateUp={navigateUp}
              onDelete={fileOps.handleDeleteFile}
              onDownload={fileOps.handleDownloadFile}
              onExtract={fileOps.handleExtractFile}
              onOpenLogFile={handleOpenLogFile}
              isLoading={fileOps.isMutating}
              selectedPaths={selection.selected}
              onToggleSelect={selectionActions.handleToggleSelect}
              onToggleSelectAll={selectionActions.handleToggleSelectAll}
              onSelectRange={selectionActions.handleSelectRange}
              selectionMode={selection.count > 0}
            />
          </div>
        )}

        {dropUpload.isDragOver && (
          <FilesDropzoneOverlay hint={t("ui.files.dropzone.hint")} />
        )}
      </div>
    </PageLayout>
  );
};

export default Files;
