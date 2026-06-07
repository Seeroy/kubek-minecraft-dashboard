"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import type { LucideIcon } from "lucide-react";
import React from "react";

export interface BulkAction {
  id: string;
  label: string;
  icon: LucideIcon;
  variant?: "default" | "destructive" | "outline" | "secondary";
  disabled?: boolean;
  run: (ids: string[]) => void;
}

interface Props {
  selectedIds: string[];
  actions: BulkAction[];
  onCancel: () => void;
}

const BulkActionBar: React.FC<Props> = ({ selectedIds, actions, onCancel }) => {
  const { t } = useTranslation("modules.sidebar.serversList");
  const count = selectedIds.length;

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card/80 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4 sm:py-3">
      <div className="inline-flex items-center justify-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:text-foreground">
        {t("bulk.selectedCount", count)}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {actions.map((a) => (
          <Button
            key={a.id}
            size="sm"
            variant={a.variant ?? "default"}
            disabled={a.disabled || count === 0}
            onClick={() => a.run(selectedIds)}
            className="px-2 sm:px-3"
            aria-label={a.label}
          >
            <a.icon />
            <span className="hidden sm:inline">{a.label}</span>
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="px-2 sm:px-3"
        >
          {t("bulk.cancel")}
        </Button>
      </div>
    </div>
  );
};

export default BulkActionBar;
