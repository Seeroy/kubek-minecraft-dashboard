"use client";

import type { ServersView } from "@/modules/sidebar/ui/serversList/useServersView";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { ViewModeToggle } from "@/shared/ui/ViewModeToggle";
import { AccessArea } from "@shared/access/areas";
import { CheckSquare, Ellipsis, FolderPlus, Network, Plus, Search, Upload } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

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
  onCreateNetwork: () => void;
}

export default function ServersListToolbar({
  searchQuery,
  onSearchChange,
  view,
  onChangeView,
  selectionMode,
  onToggleSelection,
  onCreateServer,
  onCreateFolder,
  onImport,
  onCreateNetwork,
}: Props) {
  const { t } = useTranslation("modules.sidebar.serversList");
  const selectionLabel = selectionMode ? t("bulk.exitSelection") : t("bulk.enterSelection");
  const access = useAuthStore(
    useShallow((s) => ({
      create: s.can(AccessArea.SERVERS, "write"),
      folders: s.can(AccessArea.SERVERS, "manage"),
      network: s.can(AccessArea.NETWORKS, "write") && s.can(AccessArea.SERVERS, "write"),
      // Bulk actions are moving to a folder and deleting
      bulk: s.can(AccessArea.SERVERS, "manage") || s.can(AccessArea.SETTINGS, "manage"),
    }))
  );

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-3">
      <InputGroup className="min-w-40 flex-1">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          autoFocus
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchServers")}
          aria-label={t("searchServers")}
        />
      </InputGroup>

      <ViewModeToggle value={view} onChange={onChangeView} label={t("view.label")} cardsLabel={t("view.cards")} tableLabel={t("view.table")} />

      {access.create && (
        <Button onClick={onCreateServer}>
          <Plus />
          <span className="hidden sm:inline">{t("newServer")}</span>
        </Button>
      )}
      {access.bulk && (
        <Button
          size="icon"
          variant={selectionMode ? "default" : "outline"}
          onClick={onToggleSelection}
          aria-pressed={selectionMode}
          aria-label={selectionLabel}
          title={selectionLabel}
        >
          <CheckSquare />
        </Button>
      )}
      {(access.create || access.folders) && (
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("actions.more")} title={t("actions.more")} className={buttonVariants({ variant: "outline", size: "icon" })}>
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {access.folders && (
              <DropdownMenuItem onClick={onCreateFolder}>
                <FolderPlus />
                {t("folders.create")}
              </DropdownMenuItem>
            )}
            {access.create && (
              <DropdownMenuItem onClick={onImport}>
                <Upload />
                {t("actions.import")}
              </DropdownMenuItem>
            )}
            {access.network && (
              <DropdownMenuItem onClick={onCreateNetwork}>
                <Network />
                {t("actions.createNetwork")}
                <Badge variant="warning">{t("actions.beta")}</Badge>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
