import { useTranslation } from "@/shared/hooks/useTranslation";
import { Archive, Search } from "lucide-react";

interface BackupsEmptyStateProps {
  hasFilters: boolean;
  onCreateBackup: () => void;
}

export const BackupsEmptyState = ({ hasFilters }: BackupsEmptyStateProps) => {
  const { t } = useTranslation("modules.backups");
  const Icon = hasFilters ? Search : Archive;
  const titleKey = hasFilters
    ? "emptyState.noMatches.title"
    : "emptyState.noBackups.title";
  const descriptionKey = hasFilters
    ? "emptyState.noMatches.description"
    : "emptyState.noBackups.description";

  return (
    <div className="rounded-lg border border-dashed py-16 text-center">
      <Icon className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <p className="mt-4 font-medium">{t(titleKey)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t(descriptionKey)}</p>
    </div>
  );
};
