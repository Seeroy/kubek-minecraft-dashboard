"use client";

import {
  CREATE_SERVER_MODAL_ID,
  resolveServerStatus,
  useAllServerStatuses,
  useServerFoldersQuery,
  useServerStore,
  type Server,
  type ServerStatusData,
} from "@/modules/server";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useGroupedServers } from "@/modules/sidebar/hooks/useGroupedServers";
import { useServersModal } from "@/modules/sidebar/store/servers-modal.store";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { cn } from "@/shared/lib/cn";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Kbd } from "@/shared/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { StatusDot } from "@/shared/ui/status-dot";
import { menuButton, menuLabel } from "@/shared/ui/styles";
import { AccessArea } from "@shared/access/areas";
import { ServerStatus } from "@shared/types/server/server.types";
import { ChevronDown, LayoutGrid, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

const statusTone: Record<ServerStatus, string> = {
  [ServerStatus.RUNNING]: "text-success",
  [ServerStatus.STOPPED]: "text-danger",
  [ServerStatus.STARTING]: "text-warn",
  [ServerStatus.STOPPING]: "text-c-orange",
  [ServerStatus.CRASHED]: "text-danger",
};

const liveStatus = (server: Server, live: ServerStatusData | undefined) =>
  resolveServerStatus(live, server.status);

export function ServerSwitcher() {
  const { t } = useTranslation("modules.sidebar");
  const canCreate = useAccess([AccessArea.SERVERS, "write"]);
  const { t: tStatus } = useTranslation("modules.components.serverStatus");
  const { servers, selectedServer, selectServer } = useServerStore();
  const statuses = useAllServerStatuses();
  const { data: folders } = useServerFoldersQuery();
  const mini = useSidebarStore((s) => s.mini);
  const closeDrawer = useSidebarStore((s) => s.close);
  const openServersModal = useServersModal((s) => s.setOpen);
  const { open: openModal } = useModal();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? servers.filter((s) => s.name.toLowerCase().includes(q)) : servers;
  }, [servers, query]);
  const groups = useGroupedServers(filtered, folders).filter((g) => g.servers.length > 0);
  // Loose servers get their own label only when they sit next to folders
  const hasFolders = groups.some((g) => g.folder);

  const blueprint = useBlueprint(selectedServer?.blueprintId);
  const status = selectedServer ? liveStatus(selectedServer, statuses[selectedServer.id]) : null;
  const version = selectedServer?.variables?.GAME_VERSION;
  const coreLabel = [blueprint?.shortName ?? blueprint?.name, version].filter(Boolean).join(" ");

  const choose = (id: string) => {
    selectServer(id);
    setOpen(false);
    closeDrawer();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-t-lg px-2.5 py-2 text-left transition-colors outline-none hover:bg-hover focus-visible:bg-hover data-popup-open:bg-hover sidebar-mini:justify-center sidebar-mini:rounded-lg sidebar-mini:px-0"
      >
        <span className="relative shrink-0">
          {selectedServer ? (
            <ServerAvatar serverId={selectedServer.id} name={selectedServer.name} className="size-[30px] rounded-[7px]" />
          ) : (
            <span className="block size-[30px] rounded-[7px] bg-secondary" />
          )}
          {status && (
            <StatusDot status={status} className="absolute -right-0.5 -bottom-0.5 size-2.5 ring-2 ring-card" />
          )}
        </span>
        <span className="grid min-w-0 flex-1 leading-tight sidebar-mini:hidden">
          <b className="truncate text-sm font-semibold">
            {selectedServer?.name ?? t("serversList.noServerSelected")}
          </b>
          {status && (
            <span className={cn("truncate text-[11.5px] font-medium", statusTone[status])}>
              {tStatus(status)}
              {coreLabel && <span className="font-normal text-muted-foreground"> · {coreLabel}</span>}
            </span>
          )}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground sidebar-mini:hidden" />
      </PopoverTrigger>

      <PopoverContent
        side={mini ? "right" : "bottom"}
        align="start"
        sideOffset={mini ? 12 : 4}
        className="w-(--anchor-width) min-w-[260px] gap-0 overflow-hidden p-0 sidebar-mini:w-[300px]"
      >
        <div className="border-b border-border p-2">
          <InputGroup>
            <InputGroupAddon>
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("serversList.findServer")}
            />
          </InputGroup>
        </div>

        <div role="listbox" className="max-h-[360px] scrollbar-thin overflow-auto p-1">
          {groups.length === 0 && (
            <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">{t("serversList.notFound")}</p>
          )}
          {groups.map((group) => (
            <div key={group.folder?.id ?? "none"} role="group">
              {(group.folder || hasFolders) && (
                <div className={menuLabel}>{group.folder ? group.folder.name : t("serversList.folders.noFolder")}</div>
              )}
              {group.servers.map((server) => (
                <SwitcherItem
                  key={server.id}
                  server={server}
                  live={statuses[server.id]}
                  selected={server.id === selectedServer?.id}
                  onSelect={choose}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-border p-1">
          <button
            type="button"
            className={menuButton}
            onClick={() => {
              setOpen(false);
              openServersModal(true);
            }}
          >
            <LayoutGrid />
            {t("serversList.allServers")}
            <Kbd className="ml-auto">⇧S</Kbd>
          </button>
          {canCreate && (
            <button
              type="button"
              className={menuButton}
              onClick={() => {
                setOpen(false);
                void openModal(CREATE_SERVER_MODAL_ID);
              }}
            >
              <Plus />
              {t("serversList.createServer")}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SwitcherItem({
  server,
  live,
  selected,
  onSelect,
}: {
  server: Server;
  live: ServerStatusData | undefined;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const status = liveStatus(server, live);
  const online = live?.players?.online ?? live?.runtime?.playersOnline;
  const max = live?.players?.max;

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(server.id)}
      className={cn(menuButton, "aria-selected:bg-hover")}
    >
      <ServerAvatar serverId={server.id} name={server.name} className="size-6 rounded-[5px]" />
      <span className="min-w-0 flex-1 truncate font-medium">{server.name}</span>
      {status === ServerStatus.RUNNING && online != null && (
        <span className="font-mono text-[11.5px] text-muted-foreground tabular-nums">
          {max ? `${online}/${max}` : online}
        </span>
      )}
      <StatusDot status={status} />
    </button>
  );
}
