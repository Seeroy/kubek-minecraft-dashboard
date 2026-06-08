"use client";
import { useServerStore } from "@/modules/server";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { PageLayout } from "@/shared/ui/PageLayout";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { FileText, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useLogContentQuery,
  useLogFilesQuery,
  useLogSearchQuery,
} from "../api/server-logs.queries";
import LogContentViewer from "./LogContentViewer";
import LogFileList from "./LogFileList";
import LogSearchBar from "./LogSearchBar";

const LogViewer = () => {
  const { t } = useTranslation("modules.logViewer");
  const { selectedServer } = useServerStore();
  const initialFile = useSearchParams().get("file") ?? undefined;
  const [selectedFile, setSelectedFile] = useState<string | undefined>(
    initialFile
  );
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery.trim(), 250);

  const filesQuery = useLogFilesQuery(selectedServer?.id);
  const contentQuery = useLogContentQuery(selectedServer?.id, selectedFile);
  const searchQ = useLogSearchQuery(
    selectedServer?.id,
    selectedFile,
    debouncedQuery
  );

  const visibleContent = useMemo(() => {
    return contentQuery.data ?? "";
  }, [contentQuery.data]);

  return (
    <PageLayout className="h-full overflow-hidden">
      <BlockHeader
        kicker={t("header.title")}
        title={t("header.title")}
        description={t("header.description")}
        icon={FileText}
        color="primary"
      />

      {!selectedServer ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noServer")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          {/* Left column: file list */}
          <Card className="flex min-h-0 flex-col">
            <CardHeader className="flex shrink-0 flex-row items-center justify-between">
              <span className="text-sm font-medium">{t("list.title")}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => filesQuery.refetch()}
                aria-label={t("list.refresh")}
              >
                <RefreshCw />
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-auto">
              <LogFileList
                files={filesQuery.data ?? []}
                selected={selectedFile}
                onSelect={setSelectedFile}
              />
            </CardContent>
          </Card>

          {/* Right column: log viewer */}
          <Card className="flex min-h-0 flex-col">
            <CardHeader className="shrink-0">
              <LogSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                matchesCount={
                  debouncedQuery ? (searchQ.data?.length ?? 0) : undefined
                }
              />
            </CardHeader>
            <CardContent className="min-h-0 flex-1">
              {contentQuery.isFetching && !visibleContent ? (
                <div className="text-sm text-muted-foreground">
                  {t("content.loading")}
                </div>
              ) : (
                <LogContentViewer
                  content={visibleContent}
                  searchQuery={debouncedQuery}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};

export default LogViewer;
