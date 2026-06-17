"use client";
import ServersListSearch from "@/modules/sidebar/ui/ServersListSearch";
import type { ServersView } from "@/modules/sidebar/ui/serversList/useServersView";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  CheckSquare,
  FolderPlus,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Upload,
} from "lucide-react";
import React from "react";

interface Props {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  view: ServersView;
  onChangeView: (view: ServersView) => void;
  selectionMode: boolean;
  onToggleSelection: () => void;
  onCreateServer: () => void;
  onCreateFolder: () => void;
  onImport: () => void;
}

const ServersListToolbar: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  view,
  onChangeView,
  selectionMode,
  onToggleSelection,
  onCreateServer,
  onCreateFolder,
  onImport,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList");

  const selectionLabel = selectionMode
    ? t("bulk.exitSelection")
    : t("bulk.enterSelection");

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border p-3 sm:p-4">
      <div className="w-full min-w-0 max-w-xs sm:w-72">
        <ServersListSearch value={searchQuery} onChange={onSearchChange} />
      </div>
      <div className="flex shrink-0 items-center rounded-lg border border-border p-0.5">
        <Button
          size="icon"
          variant={view === "cards" ? "secondary" : "ghost"}
          onClick={() => onChangeView("cards")}
          className="h-7 w-7"
          aria-label={t("view.cards")}
          aria-pressed={view === "cards"}
        >
          <LayoutGrid />
        </Button>
        <Button
          size="icon"
          variant={view === "table" ? "secondary" : "ghost"}
          onClick={() => onChangeView("table")}
          className="h-7 w-7"
          aria-label={t("view.table")}
          aria-pressed={view === "table"}
        >
          <List />
        </Button>
      </div>
      <Button
        size="sm"
        onClick={onCreateServer}
        className="ml-auto px-2 sm:px-3"
        aria-label={t("newServer")}
      >
        <Plus />
        <span className="hidden sm:inline">{t("newServer")}</span>
      </Button>
      <Button
        size="sm"
        variant={selectionMode ? "default" : "outline"}
        onClick={onToggleSelection}
        className="px-2"
        aria-label={selectionLabel}
        title={selectionLabel}
      >
        <CheckSquare />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="sm"
              variant="outline"
              className="px-2"
              aria-label={t("actions.more")}
              title={t("actions.more")}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCreateFolder}>
            <FolderPlus />
            {t("folders.create")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onImport}>
            <Upload />
            {t("actions.import")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ServersListToolbar;
