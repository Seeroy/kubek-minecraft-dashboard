"use client";

import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "cards" | "table";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  label: string;
  cardsLabel: string;
  tableLabel: string;
}

export function ViewModeToggle({ value, onChange, label, cardsLabel, tableLabel }: ViewModeToggleProps) {
  return (
    <ToggleGroup variant="segmented" value={[value]} onValueChange={(next) => next[0] && onChange(next[0] as ViewMode)} aria-label={label}>
      <Toggle variant="segmented" value="cards" aria-label={cardsLabel} title={cardsLabel}>
        <LayoutGrid />
      </Toggle>
      <Toggle variant="segmented" value="table" aria-label={tableLabel} title={tableLabel}>
        <List />
      </Toggle>
    </ToggleGroup>
  );
}
