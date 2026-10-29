"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import type { LucideIcon } from "lucide-react";

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

export default function BulkActionBar({ selectedIds, actions, onCancel }: Props) {
  const { t } = useTranslation("modules.sidebar.serversList");
  const count = selectedIds.length;

  return (
    <div className="flex shrink-0 animate-enter items-center gap-2 border-t border-border px-4 py-3 text-[13px] font-medium">
      <span>{t("bulk.selectedCount", count)}</span>
      <span className="flex-1" />
      {actions.map((action) => (
        <Button
          key={action.id}
          size="sm"
          variant={action.variant ?? "outline"}
          disabled={action.disabled || count === 0}
          onClick={() => action.run(selectedIds)}
          aria-label={action.label}
        >
          <action.icon />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
      <Button size="sm" variant="ghost" onClick={onCancel}>
        {t("bulk.cancel")}
      </Button>
    </div>
  );
}
