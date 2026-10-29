"use client";

import { useServerFoldersQuery, type Server } from "@/modules/server";
import { useMoveServerToFolder } from "@/modules/sidebar/hooks/useMoveServerToFolder";
import { useServerItemAccess } from "@/modules/sidebar/hooks/useServerItemAccess";
import FolderColorDot from "@/modules/sidebar/ui/FolderColorDot";
import { useTranslation } from "@/shared/hooks/useTranslation";
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
import { buttonVariants } from "@/shared/ui/button";
import { Check, Copy, Download, Ellipsis, FolderInput, FolderMinus, Pencil, Trash2 } from "lucide-react";
import { useServersList } from "./context";

export function ServerActionsMenu({ server }: { server: Server }) {
  const { t } = useTranslation("modules.sidebar.serversList");
  const { actions } = useServersList();
  const { data: folders } = useServerFoldersQuery();
  const moveToFolder = useMoveServerToFolder();
  const currentFolderId = server.folderId ?? null;
  const access = useServerItemAccess(server.id);
  const hasTop = access.duplicate || access.rename || access.moveToFolder || access.exportServer;
  if (!hasTop && !access.remove) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("actions.menu")}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(event) => event.stopPropagation()}>
        {access.duplicate && (
          <DropdownMenuItem onClick={() => actions.duplicate(server.id)}>
            <Copy />
            {t("actions.duplicate")}
          </DropdownMenuItem>
        )}
        {access.rename && (
          <DropdownMenuItem onClick={() => actions.rename(server.id)}>
            <Pencil />
            {t("actions.rename")}
          </DropdownMenuItem>
        )}
        {access.moveToFolder && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput />
              {t("folders.moveToFolder")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              <DropdownMenuItem disabled={currentFolderId == null} onClick={() => void moveToFolder(server.id, null)}>
                <FolderMinus />
                <span className="flex-1 truncate">{t("folders.noFolder")}</span>
                {currentFolderId == null && <Check />}
              </DropdownMenuItem>
              {(folders ?? []).map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  disabled={currentFolderId === folder.id}
                  onClick={() => void moveToFolder(server.id, folder.id)}
                >
                  <FolderColorDot color={folder.color} />
                  <span className="flex-1 truncate">{folder.name}</span>
                  {currentFolderId === folder.id && <Check />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {access.exportServer && (
          <DropdownMenuItem onClick={() => actions.exportServer(server.id)}>
            <Download />
            {t("actions.export")}
          </DropdownMenuItem>
        )}
        {hasTop && access.remove && <DropdownMenuSeparator />}
        {access.remove && (
          <DropdownMenuItem variant="destructive" onClick={() => actions.remove(server.id)}>
            <Trash2 />
            {t("actions.delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
