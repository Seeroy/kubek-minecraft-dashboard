"use client";
import { type ServerAddressEntry } from "@/shared/hooks/useServerAddress";
import { cn } from "@/shared/lib/cn";
import { CopyButton } from "@/shared/ui/CopyButton";
import { DropdownMenuItem } from "@/shared/ui/dropdown-menu";
import React from "react";

export interface AddressMenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  entry: ServerAddressEntry;
  active: boolean;
  onSelect: () => void;
}

export const AddressMenuItem: React.FC<AddressMenuItemProps> = ({
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
