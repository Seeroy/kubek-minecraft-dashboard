"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Checkbox } from "@/shared/ui/checkbox";
import { Plate } from "@/shared/ui/plate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { FileType, type IFile } from "@shared/types/file.types";
import { ChevronDown, ChevronsUpDown, ChevronUp, CornerLeftUp } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { FileActions, SelectModifiers } from "../lib/actions";
import { FileRow } from "./FileRow";

type SortField = "name" | "size" | "modify";
type Sort = { field: SortField; dir: 1 | -1 };

function compareFiles(a: IFile, b: IFile, field: SortField): number {
  // Folders always come first, whatever the direction
  const aDir = a.type === FileType.DIRECTORY;
  const bDir = b.type === FileType.DIRECTORY;
  if (aDir !== bDir) return aDir ? -1 : 1;
  if (field === "size") return a.size - b.size;
  if (field === "modify") return new Date(a.modify).getTime() - new Date(b.modify).getTime();
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
}

function SortButton({ field, sort, onSort, children }: { field: SortField; sort: Sort; onSort: (field: SortField) => void; children: ReactNode }) {
  const active = sort.field === field;
  const Icon = !active ? ChevronsUpDown : sort.dir === 1 ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      data-active={active || undefined}
      className="inline-flex cursor-pointer items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70 data-active:text-foreground"
    >
      {children}
      <Icon className="size-3" />
    </button>
  );
}

interface FilesTableProps {
  files: IFile[];
  actions: FileActions;
  selected: Set<string>;
  onToggle: (path: string) => void;
  onSelectMany: (paths: string[], select: boolean) => void;
  onGoUp?: () => void;
  pathHint?: (file: IFile) => string;
  empty: ReactNode;
}

export function FilesTable({ files, actions, selected, onToggle, onSelectMany, onGoUp, pathHint, empty }: FilesTableProps) {
  const { t } = useTranslation("modules.files.ui.filesList");
  const [sort, setSort] = useState<Sort>({ field: "name", dir: 1 });
  // Anchor for Shift click ranges, an index into the sorted list
  const anchorRef = useRef<number | null>(null);

  const rows = useMemo(() => [...files].sort((a, b) => compareFiles(a, b, sort.field) * sort.dir), [files, sort]);
  const paths = useMemo(() => rows.map((file) => file.path), [rows]);
  const selectedCount = paths.filter((path) => selected.has(path)).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  const onSort = (field: SortField) =>
    setSort((current) => (current.field === field ? { field, dir: current.dir === 1 ? -1 : 1 } : { field, dir: 1 }));

  const onSelect = useCallback(
    (index: number, file: IFile, mods: SelectModifiers) => {
      if (mods.shift && anchorRef.current !== null) {
        const from = Math.min(anchorRef.current, index);
        const to = Math.max(anchorRef.current, index);
        onSelectMany(paths.slice(from, to + 1), true);
        return;
      }
      anchorRef.current = index;
      onToggle(file.path);
    },
    [paths, onSelectMany, onToggle]
  );

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10 pr-0">
            <Checkbox
              checked={allSelected}
              indeterminate={selectedCount > 0 && !allSelected}
              onCheckedChange={() => onSelectMany(paths, !allSelected)}
              aria-label={t("selectAll")}
            />
          </TableHead>
          <TableHead>
            <SortButton field="name" sort={sort} onSort={onSort}>
              {t("table.headers.name")}
            </SortButton>
          </TableHead>
          <TableHead className="hidden w-28 @xl/table:table-cell">
            <SortButton field="size" sort={sort} onSort={onSort}>
              {t("table.headers.size")}
            </SortButton>
          </TableHead>
          <TableHead className="hidden w-36 @xl/table:table-cell">
            <SortButton field="modify" sort={sort} onSort={onSort}>
              {t("table.headers.modified")}
            </SortButton>
          </TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {onGoUp && (
          <TableRow tabIndex={0} onClick={onGoUp} onKeyDown={(event) => event.key === "Enter" && onGoUp()} className="h-[54px] cursor-pointer outline-none focus-visible:bg-hover">
            <TableCell className="w-10 pr-0" />
            <TableCell colSpan={4}>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Plate tone="gray" size="sm">
                  <CornerLeftUp />
                </Plate>
                ..
              </div>
            </TableCell>
          </TableRow>
        )}
        {rows.map((file, index) => (
          <FileRow
            key={file.path}
            file={file}
            index={index}
            actions={actions}
            selected={selected.has(file.path)}
            selectionMode={selected.size > 0}
            onSelect={onSelect}
            pathHint={pathHint?.(file)}
          />
        ))}
        {rows.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={5} className="h-auto p-0">
              {empty}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
