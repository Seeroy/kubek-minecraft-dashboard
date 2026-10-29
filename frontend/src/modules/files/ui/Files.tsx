"use client";
import { useBatchFileOperations } from "@/modules/files/hooks/useBatchFileOperations";
import { useFileOperations } from "@/modules/files/hooks/useFileOperations";
import { useFilesData } from "@/modules/files/hooks/useFilesData";
import { useFilesDropUpload } from "@/modules/files/hooks/useFilesDropUpload";
import { useFilesNavigation } from "@/modules/files/hooks/useFilesNavigation";
import { useFilesSelection } from "@/modules/files/hooks/useFilesSelection";
import { useServerStore, type Server } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { PageHeader } from "@/shared/ui/page-header";
import { AccessArea } from "@shared/access/areas";
import type { IFile } from "@shared/types/file.types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { FileActions } from "../lib/actions";
import { FilesBar } from "./FilesBar";
import { FilesPanel } from "./FilesPanel";
import { ServerOff } from "lucide-react";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

function ServerFiles({ server }: { server: Server }) {
  const router = useRouter();
  const navigation = useFilesNavigation();
  const { currentPath } = navigation;
  const { files, isInitialLoading, loadFiles } = useFilesData({ serverId: server.id, currentPath });
  const selection = useFilesSelection();
  const { clear: clearSelection } = selection;
  const canWrite = useAccess([AccessArea.FILES, "write"], server.id);
  const canManage = useAccess([AccessArea.FILES, "manage"], server.id);

  // A selection only makes sense inside the folder it was made in
  const { navigateToPath, navigateUp } = navigation;
  const navigate = useMemo(
    () => ({
      to: (path: string) => {
        clearSelection();
        navigateToPath(path);
      },
      up: () => {
        clearSelection();
        navigateUp();
      },
    }),
    [clearSelection, navigateToPath, navigateUp]
  );

  const batch = useBatchFileOperations({ selectedServer: server, currentPath, selection, loadFiles });
  const ops = useFileOperations({
    selectedServer: server,
    currentPath,
    loadFiles,
    navigateToPath: navigate.to,
    extractArchiveMutation: batch.extractArchiveMutation,
    extractRunner: batch.extractRunner,
  });
  const drop = useFilesDropUpload({ serverId: server.id, currentPath, onComplete: loadFiles, enabled: canWrite });

  const { handleEditFile, handleDownloadFile, handleExtractFile, handleDeleteFile } = ops;
  const actions = useMemo<FileActions>(
    () => ({
      navigate: navigate.to,
      edit: canWrite ? (file) => void handleEditFile(file) : undefined,
      download: (file) => void handleDownloadFile(file),
      extract: canManage ? (file) => void handleExtractFile(file) : undefined,
      remove: canManage ? (file) => void handleDeleteFile(file) : undefined,
      // Gzipped logs cannot be edited inline, the log viewer reads them
      openLog: (file: IFile) => router.push(`/logs?file=${encodeURIComponent(file.name)}`),
    }),
    [navigate.to, canWrite, canManage, handleEditFile, handleDownloadFile, handleExtractFile, handleDeleteFile, router]
  );

  // Delete or Backspace removes the selection, unless the user is typing
  const { handleBatchDelete } = batch;
  useEffect(() => {
    if (selection.count === 0 || !canManage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && !isTyping(event.target)) {
        event.preventDefault();
        void handleBatchDelete();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection.count, canManage, handleBatchDelete]);

  return (
    <>
      <FilesBar
        server={server}
        breadcrumbParts={navigation.breadcrumbParts}
        currentPath={currentPath}
        onNavigate={navigate.to}
        canWrite={canWrite}
        canManage={canManage}
        onUpload={ops.handleFileUpload}
        onCreated={loadFiles}
        uploadDisabled={isInitialLoading || ops.isMutating}
        selectionCount={selection.count}
        onClearSelection={clearSelection}
        onDeleteSelection={() => void handleBatchDelete()}
        onArchiveSelection={() => void batch.handleOpenArchiveModal()}
        busy={batch.isBatchBusy ? { progress: batch.activeRunner?.progress ?? null, message: batch.activeRunner?.message ?? null } : null}
      />
      <FilesPanel
        serverId={server.id}
        files={files}
        loading={isInitialLoading}
        currentPath={currentPath}
        actions={actions}
        selection={selection}
        onGoUp={navigate.up}
        drop={drop}
      />
    </>
  );
}

export default function Files() {
  const { t } = useTranslation("modules.files");
  const { selectedServer } = useServerStore();

  return (
    <div className="stagger-enter">
      <PageHeader title={t("header.title")} description={t("header.description")} />
      {selectedServer ? (
        // Keyed so path, selection and search reset on a server switch
        <ServerFiles key={selectedServer.id} server={selectedServer} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerOff />
            </EmptyMedia>
            <EmptyTitle>{t("ui.files.noServerSelected")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
