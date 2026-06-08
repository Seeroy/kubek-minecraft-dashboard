"use client";
import type { Server } from "@/modules/server";
import { ServerStatusIndicator, useServerStatus } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import BlobImage from "@/shared/ui/BlobImage";
import { DialogTrigger } from "@/shared/ui/dialog";
import { ServerStatus } from "@shared/types/server/server.types";
import { ChevronDown, Server as ServerIcon } from "lucide-react";
import React from "react";

interface Props {
  selectedServer: Server | null;
  iconErrors: Set<string>;
  onIconError: (id: string) => void;
}

const ServersListTrigger: React.FC<Props> = ({
  selectedServer,
  iconErrors,
  onIconError,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList");
  const liveStatus = useServerStatus(selectedServer?.id)?.status;

  return (
    <DialogTrigger className="flex w-full min-w-0 cursor-pointer items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/40">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {selectedServer ? (
          <div className="relative flex-shrink-0">
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-border/40 bg-muted">
              {!iconErrors.has(selectedServer.id) ? (
                <BlobImage
                  src={`servers/${selectedServer.id}/icon`}
                  alt={selectedServer.name}
                  className="h-full w-full object-cover"
                  onError={() => onIconError(selectedServer.id)}
                />
              ) : (
                <ServerIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-muted">
              <ServerStatusIndicator
                status={
                  ((liveStatus ?? selectedServer.status) as ServerStatus) ||
                  ServerStatus.STOPPED
                }
                variant="dot"
                size="sm"
                className="m-0"
              />
            </div>
          </div>
        ) : (
          <ServerStatusIndicator
            status={ServerStatus.STOPPED}
            variant="dot"
            size="sm"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <span className="w-full truncate text-left text-sm font-medium">
            {selectedServer?.name || t("noServerSelected")}
          </span>
        </div>
      </div>
      <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </DialogTrigger>
  );
};

export default ServersListTrigger;
