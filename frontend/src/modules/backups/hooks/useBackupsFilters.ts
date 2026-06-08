import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { Backup } from "@shared/types/backup.types";
import { useMemo, useState } from "react";

export const useBackupsFilters = (backups: Backup[]) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const debouncedQuery = useDebouncedValue(
    searchQuery.trim().toLowerCase(),
    250
  );

  const filteredBackups = useMemo(() => {
    return backups.filter((backup) => {
      const matchesSearch =
        !debouncedQuery ||
        backup.name.toLowerCase().includes(debouncedQuery) ||
        backup.description?.toLowerCase().includes(debouncedQuery);
      const matchesStatus =
        statusFilter === "all" || backup.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [backups, debouncedQuery, statusFilter]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredBackups,
  };
};
