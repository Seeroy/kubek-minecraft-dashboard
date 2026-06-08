"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { AuditCategory, AuditResult } from "@shared/types/audit.types";
import { Search } from "lucide-react";
import { useMemo } from "react";

export const ALL = "all";

interface AuditLogFiltersProps {
  search: string;
  category: string;
  result: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onResultChange: (value: string) => void;
}

export function AuditLogFilters({
  search,
  category,
  result,
  onSearchChange,
  onCategoryChange,
  onResultChange,
}: AuditLogFiltersProps) {
  const { t } = useTranslation("modules.auditLog");

  const categoryItems = useMemo(
    () => [
      { value: ALL, label: t("filters.allCategories") },
      ...Object.values(AuditCategory).map((c) => ({ value: c, label: t(`categories.${ c }`) })),
    ],
    [t],
  );

  const resultItems = useMemo(
    () => [
      { value: ALL, label: t("filters.allResults") },
      ...Object.values(AuditResult).map((r) => ({ value: r, label: t(`results.${ r }`) })),
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
        <Input
          value={ search }
          onChange={ (e) => onSearchChange(e.target.value) }
          placeholder={ t("filters.searchPlaceholder") }
          className="pl-9"
        />
      </div>

      <Select items={ categoryItems } value={ category } onValueChange={ (v) => onCategoryChange(v as string) }>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue/>
        </SelectTrigger>
        <SelectContent>
          { categoryItems.map((item) => (
            <SelectItem key={ item.value } value={ item.value }>{ item.label }</SelectItem>
          )) }
        </SelectContent>
      </Select>

      <Select items={ resultItems } value={ result } onValueChange={ (v) => onResultChange(v as string) }>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue/>
        </SelectTrigger>
        <SelectContent>
          { resultItems.map((item) => (
            <SelectItem key={ item.value } value={ item.value }>{ item.label }</SelectItem>
          )) }
        </SelectContent>
      </Select>
    </div>
  );
}
