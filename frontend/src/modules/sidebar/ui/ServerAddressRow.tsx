"use client";
import { useServerStore } from "@/modules/server";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useServerAddress, type ServerAddressEntry } from "@/shared/hooks/useServerAddress";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { CopyButton } from "@/shared/ui/CopyButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ChevronDown, Globe, House, Network } from "lucide-react";
import { useMemo, useState } from "react";

const valueRow =
  "flex h-[30px] min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1.5 text-c-blue outline-none [&>svg:first-child]:size-3.5";

export default function ServerAddressRow() {
  const { selectedServer } = useServerStore();
  const blueprint = useBlueprint(selectedServer?.blueprintId);
  const { publicEntry, localEntries, primary, loading } = useServerAddress(selectedServer?.id, blueprint);
  const { t } = useTranslation("modules.sidebar.serverAddress");
  const [activeHost, setActiveHost] = useState<string | null>(null);

  const entries = useMemo(
    () => [
      ...(publicEntry ? [{ entry: publicEntry, title: t("mode.public"), icon: Globe }] : []),
      ...localEntries.map((entry, index) => ({
        entry,
        title: index === 0 ? t("mode.local") : `${t("mode.local")} #${index + 1}`,
        icon: House,
      })),
    ],
    [publicEntry, localEntries, t]
  );

  if (!selectedServer) return null;

  const active = entries.find((item) => item.entry.host === activeHost) ?? entries.find((item) => item.entry === primary);
  const Icon = active?.icon ?? Network;
  const value: ServerAddressEntry | undefined = active?.entry;
  const text = value?.full ?? (loading ? t("loading") : t("unavailable"));

  const content = (
    <>
      <Icon />
      <span className="min-w-0 flex-1 truncate text-left font-mono text-xs text-foreground">{text}</span>
    </>
  );

  return (
    <div className="flex items-center gap-0.5 border-t border-sidebar-border/60 py-0.5 pr-1 pl-1.5 sidebar-mini:hidden">
      {entries.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            title={t("chooseAddress")}
            className={`${valueRow} cursor-pointer transition-colors hover:bg-hover focus-visible:bg-hover data-popup-open:bg-hover`}
          >
            {content}
            <ChevronDown className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-(--anchor-width) min-w-64">
            {entries.map(({ entry, title, icon: ItemIcon }) => (
              <DropdownMenuItem
                key={entry.host}
                onClick={() => setActiveHost(entry.host)}
                data-active={entry === value || undefined}
                className="data-active:bg-hover"
              >
                <ItemIcon />
                <span>{title}</span>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">{entry.full}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className={valueRow}>{content}</div>
      )}
      {value && <CopyButton value={value.full} title={t("copy")} />}
    </div>
  );
}
