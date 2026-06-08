"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Copy, Download, MoreVertical, Pencil, Trash2 } from "lucide-react";
import React from "react";

interface Props {
  serverId: string;
  onDuplicate: (id: string) => void;
  onRename: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
}

const ServerCardMenu: React.FC<Props> = ({
  serverId,
  onDuplicate,
  onRename,
  onExport,
  onDelete,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList.actions");

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
