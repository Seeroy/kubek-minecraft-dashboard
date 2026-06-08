"use client";
import type { Translator } from "@/locales/types";
import { CREATE_DIRECTORY_MODAL_ID } from "@/modules/files/modals/NewDirectoryModal";
import { CREATE_FILE_MODAL_ID } from "@/modules/files/modals/NewFileModal";
import { useModal } from "@/shared/hooks/useModalsManager";
import { Button } from "@/shared/ui/button";
import { FilePlus, FolderPlus, Upload } from "lucide-react";
import React from "react";

interface FilesToolbarProps {
  currentPath: string;
  onUpload: () => void;
  onCreated: () => void;
  uploadDisabled?: boolean;
  t: Translator;
}

const FilesToolbar: React.FC<FilesToolbarProps> = ({
  currentPath,
  onUpload,
  onCreated,
  uploadDisabled,
  t,
}) => {
  const { open: openModal } = useModal();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        className="min-w-0 flex-1 sm:flex-none"
        onClick={() =>
          openModal(CREATE_FILE_MODAL_ID, { currentPath, onCreated })
        }
      >
        <FilePlus className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">
          {t("ui.files.buttons.createFile")}
        </span>
      </Button>
      <Button
        variant="secondary"
        className="min-w-0 flex-1 sm:flex-none"
        onClick={() =>
          openModal(CREATE_DIRECTORY_MODAL_ID, { currentPath, onCreated })
        }
      >
        <FolderPlus className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">
          {t("ui.files.buttons.createFolder")}
        </span>
      </Button>
      <Button
        variant="ghost"
        className="min-w-0 flex-1 sm:flex-none"
        onClick={onUpload}
        disabled={uploadDisabled}
      >
        <Upload className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">{t("ui.files.buttons.upload")}</span>
      </Button>
    </div>
  );
};

export default FilesToolbar;
