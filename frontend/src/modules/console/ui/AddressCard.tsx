"use client";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useServerAddress } from "@/shared/hooks/useServerAddress";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { CopyButton } from "@/shared/ui/CopyButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { ChevronDown, Globe, House, Network } from "lucide-react";
import { useMemo, useState } from "react";
import { InfoCard } from "./InfoCard";

export function AddressCard({ serverId, blueprintId }: { serverId: string; blueprintId?: string }) {
  const { t } = useTranslation("modules.console.cards");
  const { t: tAddress } = useTranslation("modules.sidebar.serverAddress");
  const { publicEntry, localEntries, primary, loading } = useServerAddress(serverId, useBlueprint(blueprintId));
  const [activeHost, setActiveHost] = useState<string | null>(null);

  const entries = useMemo(
    () => [
      ...(publicEntry ? [{ entry: publicEntry, title: tAddress("mode.public"), icon: Globe }] : []),
      ...localEntries.map((entry, index) => ({
        entry,
        title: index === 0 ? tAddress("mode.local") : `${tAddress("mode.local")} #${index + 1}`,
        icon: House,
      })),
    ],
    [publicEntry, localEntries, tAddress]
  );
  const active = entries.find((item) => item.entry.host === activeHost) ?? entries.find((item) => item.entry === primary);
  const text = active?.entry.full ?? (loading ? tAddress("loading") : tAddress("unavailable"));

  const value =
    entries.length > 1 ? (
      <DropdownMenu>
        <DropdownMenuTrigger className="flex max-w-full cursor-pointer items-center gap-1 rounded-sm font-mono text-[13px] outline-none hover:text-primary focus-visible:outline-2 focus-visible:outline-primary/70">
          <span className="truncate">{text}</span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {entries.map(({ entry, title, icon: Icon }) => (
            <DropdownMenuItem key={entry.host} onClick={() => setActiveHost(entry.host)}>
              <Icon />
              <span>{title}</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">{entry.full}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <span className="font-mono text-[13px]">{text}</span>
    );

  return (
    <InfoCard
      icon={active?.icon ?? Network}
      tone="blue"
      label={active ? `${t("address")} · ${active.title}` : t("address")}
      value={value}
      action={active && <CopyButton value={active.entry.full} title={t("copyAddress")} />}
    />
  );
}
