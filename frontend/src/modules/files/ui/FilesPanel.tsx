"use client";
import { useFilesSearch } from "@/modules/files/api/files.queries";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { humanizeFileSize } from "@/shared/lib/bytesToGb";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel, PanelFoot, PanelHead } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { FileType, type IFile } from "@shared/types/file.types";
import { Folder, Search, Upload } from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";
import type { FileActions } from "../lib/actions";
import type { FilesSelection } from "../hooks/useFilesSelection";
import { FilesTable } from "./FilesTable";

type Scope = "folder" | "all";

const parentDir = (path: string) => {
  const parts = path.split(/[/\\]/).filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join("/")}` : "/";
};

interface FilesPanelProps {
  serverId: string;
  files: IFile[];
  loading: boolean;
  currentPath: string;
  actions: FileActions;
  selection: FilesSelection;
  onGoUp: () => void;
  drop: {
    isDragOver: boolean;
    handleDragEnter: (event: DragEvent) => void;
    handleDragLeave: (event: DragEvent) => void;
    handleDragOver: (event: DragEvent) => void;
    handleDrop: (event: DragEvent) => void;
  };
}

export function FilesPanel({ serverId, files, loading, currentPath, actions, selection, onGoUp, drop }: FilesPanelProps) {
  const { t } = useTranslation("modules.files.ui");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("folder");
  const search = useDebouncedValue(query.trim().toLowerCase(), 200);
  const global = scope === "all" && search.length >= 2;
  const results = useFilesSearch(serverId, search, scope === "all");

  const shown = useMemo(() => {
    if (global) return results.data ?? [];
    return search ? files.filter((file) => file.name.toLowerCase().includes(search)) : files;
  }, [global, results.data, files, search]);

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + (file.type === FileType.FILE ? file.size : 0), 0),
    [files]
  );

  // Opening a search result drops back to plain browsing at its folder
  const searchActions = useMemo<FileActions>(
    () => ({
      ...actions,
      navigate: (path) => {
        setQuery("");
        setScope("folder");
        actions.navigate(path);
      },
    }),
    [actions]
  );

  const empty = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Folder />
        </EmptyMedia>
        <EmptyTitle>{search ? t("filesList.noMatches") : t("filesList.empty.title")}</EmptyTitle>
        <EmptyDescription>
          {global ? t("filesList.search.empty", { query: search }) : search ? null : t("filesList.empty.hint")}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <Panel
      className="relative overflow-hidden"
      onDragEnter={drop.handleDragEnter}
      onDragLeave={drop.handleDragLeave}
      onDragOver={drop.handleDragOver}
      onDrop={drop.handleDrop}
    >
      <PanelHead className="flex-wrap gap-2 py-2">
        <InputGroup className="max-w-90 min-w-48 flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={scope === "all" ? t("filesList.search.placeholderAll") : t("filesList.searchPlaceholder")}
            aria-label={t("filesList.searchPlaceholder")}
          />
        </InputGroup>
        <ToggleGroup variant="segmented" value={[scope]} onValueChange={(next) => next[0] && setScope(next[0] as Scope)}>
          <Toggle variant="segmented" value="folder">{t("filesList.search.scope.folder")}</Toggle>
          <Toggle variant="segmented" value="all">{t("filesList.search.scope.all")}</Toggle>
        </ToggleGroup>
      </PanelHead>

      {loading || (global && results.isLoading) ? (
        <div className="grid gap-2 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <FilesTable
          files={shown}
          actions={global ? searchActions : actions}
          selected={selection.selected}
          onToggle={selection.toggle}
          onSelectMany={selection.selectMany}
          onGoUp={currentPath && !search ? onGoUp : undefined}
          pathHint={global ? (file) => parentDir(file.path) : undefined}
          empty={empty}
        />
      )}

      <PanelFoot>
        {global ? t("filesList.search.found", { count: shown.length }) : t("filesList.summary", files.length, humanizeFileSize(totalSize))}
      </PanelFoot>

      {drop.isDragOver && (
        <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-lg border-2 border-dashed border-primary/70 bg-background/70 backdrop-blur-[3px]">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="size-8" />
            <p className="text-[13px] font-medium">{t("files.dropzone.hint")}</p>
            <p className="font-mono text-xs text-muted-foreground">/{currentPath}</p>
          </div>
        </div>
      )}
    </Panel>
  );
}
