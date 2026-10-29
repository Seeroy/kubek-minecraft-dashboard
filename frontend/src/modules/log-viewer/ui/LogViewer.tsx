"use client";
import { useServerStore, type Server } from "@/modules/server";
import { TopbarActions } from "@/modules/topbar";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { PageHeader } from "@/shared/ui/page-header";
import { RotateCw, ServerOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLogContentQuery, useLogFilesQuery } from "../api/server-logs.queries";
import { LogFiles } from "./LogFiles";
import { LogView } from "./LogView";

const DEFAULT_FILE = "latest.log";

function ServerLogs({ server }: { server: Server }) {
  const { t } = useTranslation("modules.logViewer");
  // Other screens deep link a file, e.g. a gzipped log from the file manager
  const linked = useSearchParams().get("file") ?? undefined;
  const [picked, setPicked] = useState<string | undefined>(linked);
  const files = useLogFilesQuery(server.id);
  const name = picked ?? files.data?.find((file) => file.name === DEFAULT_FILE)?.name ?? files.data?.[0]?.name;
  const content = useLogContentQuery(server.id, name);
  const file = files.data?.find((item) => item.name === name);
  const refreshing = files.isFetching || content.isFetching;

  const refresh = () => {
    void files.refetch();
    if (name) void content.refetch();
  };

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <TopbarActions>
        <Button variant="ghost" size="sm" disabled={refreshing} onClick={refresh}>
          <RotateCw className={refreshing ? "animate-spin" : undefined} />
          {t("refresh")}
        </Button>
      </TopbarActions>
      <LogFiles files={files.data} selected={name} onSelect={setPicked} />
      {/* Keyed so search and scroll start over for every file */}
      <LogView key={name ?? "none"} file={file} content={content.data} loading={content.isLoading} />
    </div>
  );
}

export default function LogViewer() {
  const { t } = useTranslation("modules.logViewer");
  const { selectedServer } = useServerStore();

  return (
    <div className="stagger-enter flex flex-col lg:h-full lg:min-h-[560px]">
      <PageHeader title={t("title")} description={t("description")} className="mb-4" />
      {selectedServer ? (
        <ServerLogs key={selectedServer.id} server={selectedServer} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerOff />
            </EmptyMedia>
            <EmptyTitle>{t("noServer.title")}</EmptyTitle>
            <EmptyDescription>{t("noServer.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
