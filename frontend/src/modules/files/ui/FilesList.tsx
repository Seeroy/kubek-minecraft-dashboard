"use client";

import FileItem from "@/modules/files/ui/FileItem";
import FilesSearchResults from "@/modules/files/ui/FilesSearchResults";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { useFilesSearch } from "@/modules/files/api/files.queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { PageLoading } from "@/shared/ui/PageLoading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { FileType, IFile } from "@shared/types/file.types";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileSearch,
  Search,
} from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";

type SortField = "name" | "size" | "modify";
type SortDirection = "asc" | "desc";

interface FilesListProps {
  files: IFile[];
  currentPath?: string;
  serverId?: string;
  onEdit?: (file: IFile) => void;
  onNavigate?: (path: string) => void;
  onNavigateUp?: () => void;
  onDelete?: (file: IFile) => void;
  onDownload?: (file: IFile) => void;
  onExtract?: (file: IFile) => void;
  onOpenLogFile?: (file: IFile) => void;
  isLoading?: boolean;
  selectedPaths?: Set<string>;
  onToggleSelect?: (file: IFile) => void;
  onToggleSelectAll?: (paths: string[], allSelected: boolean) => void;
  onSelectRange?: (paths: string[]) => void;
  selectionMode?: boolean;
}

export type RowClickModifiers = { ctrl: boolean; shift: boolean };

function compareFiles(a: IFile, b: IFile, field: SortField): number {
  // Directories always sort before files, regardless of direction
  const aIsDir = a.type === FileType.DIRECTORY;
  const bIsDir = b.type === FileType.DIRECTORY;
  if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;

  switch (field) {
    case "name":
      return a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      });
    case "size":
      return a.size - b.size;
    case "modify":
      return new Date(a.modify).getTime() - new Date(b.modify).getTime();
  }
}

function SortHeader({
  label,
  field,
  activeField,
  activeDirection,
  onClick,
  className,
}: {
  label: React.ReactNode;
  field: SortField;
  activeField: SortField;
  activeDirection: SortDirection;
  onClick: (field: SortField) => void;
  className?: string;
}) {
  const isActive = activeField === field;
  const Icon = !isActive
    ? ArrowUpDown
    : activeDirection === "asc"
      ? ArrowUp
      : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onClick(field)}
        className="inline-flex items-center gap-1.5 text-foreground/70 transition-colors hover:text-foreground"
      >
        {label}
        <Icon className={`h-3 w-3 ${isActive ? "" : "opacity-40"}`} />
      </button>
    </TableHead>
  );
}

const FilesList: React.FC<FilesListProps> = ({
  files,
  currentPath = "",
  serverId,
  onEdit,
  onNavigate,
  onNavigateUp,
  onDelete,
  onDownload,
  onExtract,
  onOpenLogFile,
  isLoading,
  selectedPaths,
  onToggleSelect,
  onToggleSelectAll,
  onSelectRange,
  selectionMode = false,
}) => {
  const { t } = useTranslation("modules.files");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(
    searchQuery.trim().toLowerCase(),
    200
  );
  const [scope, setScope] = useState<"folder" | "all">("folder");

  // Global (recursive) search runs against the backend; the in-folder scope
  // keeps the instant client-side filter below
  const isGlobalSearch = scope === "all" && debouncedQuery.length >= 2;
  const searchResults = useFilesSearch(
    serverId,
    debouncedQuery,
    scope === "all"
  );

  const handleSearchNavigate = useCallback(
    (path: string) => {
      // Leaving search results: drop back to folder browsing at the target path
      setScope("folder");
      setSearchQuery("");
      onNavigate?.(path);
    },
    [onNavigate]
  );

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const visibleFiles = useMemo(() => {
    const filtered = debouncedQuery
      ? files.filter((f) => f.name.toLowerCase().includes(debouncedQuery))
      : files;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compareFiles(a, b, sortField) * dir);
  }, [files, debouncedQuery, sortField, sortDirection]);

  const visiblePaths = useMemo(
    () => visibleFiles.map((f) => f.path),
    [visibleFiles]
  );
  const selectedVisibleCount = useMemo(() => {
    if (!selectedPaths || selectedPaths.size === 0) return 0;
    let count = 0;
    for (const p of visiblePaths) if (selectedPaths.has(p)) count++;
    return count;
  }, [visiblePaths, selectedPaths]);
  const allVisibleSelected =
    visibleFiles.length > 0 && selectedVisibleCount === visibleFiles.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  // Anchor index for Shift+click range selection (refers to position in visibleFiles)
  const anchorIndexRef = useRef<number | null>(null);

  const handleRowSelect = useCallback(
    (index: number, file: IFile, mods: RowClickModifiers) => {
      if (mods.shift && anchorIndexRef.current !== null && onSelectRange) {
        const from = Math.min(anchorIndexRef.current, index);
        const to = Math.max(anchorIndexRef.current, index);
        const rangePaths = visibleFiles.slice(from, to + 1).map((f) => f.path);
        onSelectRange(rangePaths);
        return;
      }
      anchorIndexRef.current = index;
      onToggleSelect?.(file);
    },
    [visibleFiles, onSelectRange, onToggleSelect]
  );

  if (isLoading && files.length === 0) {
    return <PageLoading />;
  }

  // Root path is the empty string; any non-empty path is inside a subfolder
  const showGoUp = !!currentPath;

  // At the server root with no files: show a friendly empty card (no ".." anyway)
  if (files.length === 0 && !showGoUp) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <FileSearch className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>{t("ui.filesList.empty.title")}</CardTitle>
              <CardDescription>
                {t("ui.filesList.empty.subtitle")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <FileSearch className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>{t("ui.filesList.empty.description")}</p>
            <p className="text-sm">{t("ui.filesList.empty.hint")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              scope === "all"
                ? t("ui.filesList.search.placeholderAll")
                : t("ui.filesList.searchPlaceholder")
            }
            className="pl-9"
          />
        </div>
        {serverId && (
          <div className="inline-flex h-10 w-full items-center rounded-lg border bg-card p-0.5 sm:w-auto">
            {(["folder", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={cn(
                  "flex h-full flex-1 items-center justify-center rounded-md px-3 text-sm whitespace-nowrap transition-colors sm:flex-none",
                  scope === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`ui.filesList.search.scope.${value}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {isGlobalSearch ? (
        <FilesSearchResults
          results={searchResults.data ?? []}
          isLoading={searchResults.isLoading}
          query={debouncedQuery}
          onNavigate={handleSearchNavigate}
          onEdit={onEdit}
          onDownload={onDownload}
          onExtract={onExtract}
          onDelete={onDelete}
          t={t}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="max-h-[72vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-card">
                  <TableHead
                    className="w-10 pr-0 pl-4 align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      onCheckedChange={() =>
                        onToggleSelectAll?.(visiblePaths, allVisibleSelected)
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                  <SortHeader
                    label={t("ui.filesList.table.headers.name")}
                    field="name"
                    activeField={sortField}
                    activeDirection={sortDirection}
                    onClick={toggleSort}
                  />
                  <SortHeader
                    label={t("ui.filesList.table.headers.size")}
                    field="size"
                    activeField={sortField}
                    activeDirection={sortDirection}
                    onClick={toggleSort}
                    className="hidden sm:table-cell"
                  />
                  <SortHeader
                    label={t("ui.filesList.table.headers.modified")}
                    field="modify"
                    activeField={sortField}
                    activeDirection={sortDirection}
                    onClick={toggleSort}
                    className="hidden md:table-cell"
                  />
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showGoUp && (
                  <TableRow
                    className="cursor-pointer bg-card/20 transition-colors hover:bg-card/60"
                    onClick={onNavigateUp}
                  >
                    <TableCell className="w-10 pr-0 pl-4" />
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-500/10 p-2">
                          <ArrowUp className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">
                            ..
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      <span className="text-muted-foreground/50">-</span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      <span className="text-muted-foreground/50">-</span>
                    </TableCell>
                    <TableCell className="pr-6"></TableCell>
                  </TableRow>
                )}
                {visibleFiles.map((item, index) => (
                  <FileItem
                    key={item.path}
                    file={item}
                    index={index}
                    onEdit={onEdit}
                    onNavigate={onNavigate}
                    onDelete={onDelete}
                    onDownload={onDownload}
                    onExtract={onExtract}
                    onOpenLogFile={onOpenLogFile}
                    selected={selectedPaths?.has(item.path) ?? false}
                    selectionMode={selectionMode}
                    onSelect={handleRowSelect}
                  />
                ))}
                {visibleFiles.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      {files.length === 0
                        ? t("ui.filesList.empty.description")
                        : t("ui.filesList.noMatches")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesList;
