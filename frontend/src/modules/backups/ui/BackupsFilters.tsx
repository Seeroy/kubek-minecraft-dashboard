import { useTranslation } from "@/shared/hooks/useTranslation";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Filter, Search } from "lucide-react";

interface BackupsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export const BackupsFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: BackupsFiltersProps) => {
  const { t } = useTranslation("modules.backups");

  const statusItems: { value: string; label: string }[] = [
    { value: "all", label: t("filters.status.all") },
    { value: "completed", label: t("filters.status.completed") },
    { value: "creating", label: t("filters.status.creating") },
    { value: "failed", label: t("filters.status.failed") },
    { value: "paused", label: t("filters.status.paused") },
  ];

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <Input
            placeholder={t("filters.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <Select
        items={statusItems}
        value={statusFilter}
        onValueChange={(value) => value != null && onStatusFilterChange(value)}
      >
        <SelectTrigger className="w-full flex-shrink-0 sm:w-[160px]">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={t("filters.status.all")} />
        </SelectTrigger>
        <SelectContent>
          {statusItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
