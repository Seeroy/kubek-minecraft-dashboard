"use client";
import {
  useServerAddress,
  type ServerAddressEntry,
} from "@/shared/hooks/useServerAddress";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { CopyButton } from "@/shared/ui/CopyButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ChevronDown, Globe, House, Network } from "lucide-react";
import React, { useMemo, useState } from "react";
import { AddressMenuItem } from "./AddressMenuItem";
import { InfoCard } from "./InfoCard";

interface AddressCardProps {
  serverId: string;
}

export const AddressCard: React.FC<AddressCardProps> = ({ serverId }) => {
  const { t } = useTranslation("modules.console");
  const tAddress = useTranslation("modules.sidebar.serverAddress").t;
  const { publicEntry, localEntries, primary, loading } =
    useServerAddress(serverId);

  const [activeHost, setActiveHost] = useState<string | null>(null);

  const activeEntry = useMemo<ServerAddressEntry | null>(() => {
    if (activeHost) {
      if (publicEntry?.host === activeHost) return publicEntry;
      const match = localEntries.find((e) => e.host === activeHost);
      if (match) return match;
    }
    return primary;
  }, [activeHost, publicEntry, localEntries, primary]);

  const hasMultiple = !!publicEntry && localEntries.length > 0;
  const ModeIcon =
    activeEntry?.label === "public"
      ? Globe
      : activeEntry?.label === "local"
        ? House
        : Network;

  const valueNode = (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">
        {activeEntry?.full ||
          (loading ? tAddress("loading") : tAddress("unavailable"))}
      </span>
      {hasMultiple && (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </div>
  );

  const trailingActions = (
    <CopyButton
      value={activeEntry?.full || ""}
      title={t("console.cards.copyAddress")}
    />
  );

  if (!hasMultiple) {
    return (
      <InfoCard
        icon={ModeIcon}
        label={t("console.cards.address")}
        value={valueNode}
        iconBgClass="bg-blue-500/15"
        iconTextClass="text-blue-500"
        action={trailingActions}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-secondary/20 transition-colors hover:bg-secondary/40">
      <div className="flex items-stretch">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-3 rounded-l-xl px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <div className="shrink-0 rounded-md bg-blue-500/15 p-1.5">
              <ModeIcon className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                {t("console.cards.address")} ·{" "}
                {tAddress(`mode.${activeEntry?.label || "public"}`)}
              </div>
              <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                <span className="truncate">
                  {activeEntry?.full || tAddress("unavailable")}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="mt-1.5 w-80">
            {publicEntry && (
              <AddressMenuItem
                icon={Globe}
                title={tAddress("mode.public")}
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
                  idx === 0
                    ? tAddress("mode.local")
                    : `${tAddress("mode.local")} #${idx + 1}`
                }
                entry={entry}
                active={activeEntry?.host === entry.host}
                onSelect={() => setActiveHost(entry.host)}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center pr-2">{trailingActions}</div>
      </div>
    </div>
  );
};

export default AddressCard;
