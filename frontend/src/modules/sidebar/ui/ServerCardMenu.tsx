"use client";
import { useServerFoldersQuery } from "@/modules/server";
import { useMoveServerToFolder } from "@/modules/sidebar/hooks/useMoveServerToFolder";
import FolderColorDot from "@/modules/sidebar/ui/FolderColorDot";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Check,
  Copy,
  Download,
  FolderInput,
  FolderMinus,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import React from "react";

interface Props {
  serverId: string;
  currentFolderId?: string | null;
  onDuplicate: (id: string) => void;
  onRename: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
}

const ServerCardMenu: React.FC<Props> = ({
  serverId,
  currentFolderId,
  onDuplicate,
  onRename,
  onExport,
  onDelete,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList.actions");
  const { t: tFolders } = useTranslation("modules.sidebar.serversList.folders");
  const { data: folders } = useServerFoldersQuery();
  const moveToFolder = useMoveServerToFolder();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={t("menu")}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onDuplicate(serverId)}>
          <Copy />
          {t("duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRename(serverId)}>
          <Pencil />
          {t("rename")}
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderInput />
            {tFolders("moveToFolder")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            <DropdownMenuItem
              disabled={currentFolderId == null}
              onClick={() => void moveToFolder(serverId, null)}
            >
              <FolderMinus />
              <span className="flex-1 truncate">{tFolders("noFolder")}</span>
              {currentFolderId == null && <Check className="size-4" />}
            </DropdownMenuItem>
            {(folders ?? []).map((f) => (
              <DropdownMenuItem
                key={f.id}
                disabled={currentFolderId === f.id}
                onClick={() => void moveToFolder(serverId, f.id)}
              >
                <FolderColorDot color={f.color} />
                <span className="flex-1 truncate">{f.name}</span>
                {currentFolderId === f.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem onClick={() => onExport(serverId)}>
          <Download />
          {t("export")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(serverId)}
        >
          <Trash2 />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ServerCardMenu;
