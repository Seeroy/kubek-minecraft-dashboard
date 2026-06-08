"use client";
import { useServerStore } from "@/modules/server";
import {
  useServerAddress,
  type ServerAddressEntry,
} from "@/shared/hooks/useServerAddress";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { CopyButton } from "@/shared/ui/CopyButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ChevronDown, Globe, House, Network } from "lucide-react";
import React, { useMemo, useState } from "react";

const ServerAddressRow = () => {
  const { selectedServer } = useServerStore();
  const { publicEntry, localEntries, primary, loading } = useServerAddress(
    selectedServer?.id
  );
  const { t } = useTranslation("modules.sidebar.serverAddress");

  const [activeHost, setActiveHost] = useState<string | null>(null);

  const activeEntry = useMemo<ServerAddressEntry | null>(() => {
    if (activeHost) {
      if (publicEntry?.host === activeHost) return publicEntry;
      const match = localEntries.find((e) => e.host === activeHost);
      if (match) return match;
    }
    return primary;
  }, [activeHost, publicEntry, localEntries, primary]);

  if (!selectedServer) return null;

  const hasMultiple = !!publicEntry && localEntries.length > 0;
  const ModeIcon = activeEntry?.label === "public" ? Globe : House;
  const labelText = activeEntry
    ? t(`mode.${activeEntry.label}`, activeEntry.label)
    : loading
      ? t("loading")
      : t("unavailable");

  const iconNode = (
    <div className="shrink-0 rounded-md bg-blue-500/10 p-1">
      {activeEntry ? (
        <ModeIcon className="h-3.5 w-3.5 text-blue-500" />
      ) : (
        <Network className="h-3.5 w-3.5 text-blue-500" />
      )}
    </div>
  );

  const copyNode = (
    <CopyButton
      value={activeEntry?.full || ""}
      title={t("copy")}
      className="p-1"
      iconClassName="h-3 w-3"
    />
  );

  if (!hasMultiple) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/40">
        {iconNode}
        <div
          className={cn(
            "min-w-0 flex-1",
            !activeEntry && "text-muted-foreground"
          )}
        >
          <div className="text-[10px] leading-none font-bold tracking-wider text-muted-foreground uppercase">
            {labelText}
          </div>
          <div className="mt-0.5 truncate font-mono text-xs leading-tight font-medium">
            {activeEntry?.full || (loading ? t("loading") : t("unavailable"))}
          </div>
        </div>
        {copyNode}
      </div>
    );
  }

  return (
    <div className="flex items-stretch transition-colors hover:bg-accent/40">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          {iconNode}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[10px] leading-none font-bold tracking-wider text-muted-foreground uppercase">
              {labelText}
            </span>
            <span className="mt-0.5 flex items-center gap-1 truncate font-mono text-xs leading-tight font-medium">
              <span className="truncate">
                {activeEntry?.full || t("unavailable")}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="mt-1.5 w-[305px]">
          {publicEntry && (
            <AddressMenuItem
              icon={Globe}
              title={t("mode.public")}
              entry={publicEntry}
              active={activeEntry?.host === publicEntry.host}
              onSelect={() => setActiveHost(publicEntry.host)}
            />
          )}
          {localEntries.map((entry, idx) => (
            <AddressMenuItem
              key={`${entry.host}-${idx}`}
              icon={House}
              title={
                idx === 0 ? t("mode.local") : `${t("mode.local")} #${idx + 1}`
              }
              entry={entry}
              active={activeEntry?.host === entry.host}
              onSelect={() => setActiveHost(entry.host)}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center pr-1.5">{copyNode}</div>
    </div>
  );
};

interface AddressMenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  entry: ServerAddressEntry;
  active: boolean;
  onSelect: () => void;
}

const AddressMenuItem: React.FC<AddressMenuItemProps> = ({
  icon: Icon,
  title,
  entry,
  active,
  onSelect,
}) => {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2",
        active && "bg-accent/40"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] leading-none font-bold tracking-wider text-muted-foreground uppercase">
          {title}
        </span>
        <span className="truncate font-mono text-xs">{entry.full}</span>
      </div>
      <CopyButton value={entry.full} className="p-1" iconClassName="h-3 w-3" />
    </DropdownMenuItem>
  );
};

export default ServerAddressRow;
