"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { RotateCw, TriangleAlert } from "lucide-react";

interface LoadErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Failed query in place of its content, with a retry */
export function LoadError({ title, description, onRetry, retrying, className }: LoadErrorProps) {
  const { t } = useTranslation("modules.components.loadError");

  return (
    <Empty className={cn("rounded-lg border border-border bg-card py-14", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>{title ?? t("title")}</EmptyTitle>
        <EmptyDescription>{description ?? t("description")}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" disabled={retrying} onClick={onRetry}>
            <RotateCw className={retrying ? "animate-spin" : undefined} />
            {t("retry")}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

interface FailedQuery {
  isError: boolean;
  isFetching: boolean;
  data: unknown;
  refetch: () => unknown;
}

/** LoadError for a query that failed with nothing cached, for DataReveal's error prop */
export function queryLoadError(query: FailedQuery, className?: string) {
  if (!query.isError || query.data !== undefined) return undefined;
  return <LoadError className={className} onRetry={() => void query.refetch()} retrying={query.isFetching} />;
}
