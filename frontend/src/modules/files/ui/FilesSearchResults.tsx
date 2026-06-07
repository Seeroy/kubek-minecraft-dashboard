"use client";
import type { Translator } from "@/locales/types";
import FileItem from "@/modules/files/ui/FileItem";
import { PageLoading } from "@/shared/ui/PageLoading";
import { Table, TableBody } from "@/shared/ui/table";
import { IFile } from "@shared/types/file.types";
import { FileSearch } from "lucide-react";
import React from "react";

interface FilesSearchResultsProps {
  results: IFile[];
  isLoading: boolean;
  query: string;
  onNavigate?: (path: string) => void;
  onEdit?: (file: IFile) => void;
  onDownload?: (file: IFile) => void;
  onExtract?: (file: IFile) => void;
  onDelete?: (file: IFile) => void;
  t: Translator;
}

/** Folder path that contains the given item, used as a result subtitle */
function parentDir(path: string): string {
  const parts = path.split(/[\/\\]/).filter(Boolean);
  parts.pop();
  return parts.length ? parts.join("/") : "/";
}

const FilesSearchResults: React.FC<FilesSearchResultsProps> = ({
  results,
  isLoading,
  query,
  onNavigate,
  onEdit,
  onDownload,
  onExtract,
  onDelete,
  t,
}) => {
  if (isLoading && results.length === 0) {
    return <PageLoading />;
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
        <FileSearch className="mx-auto mb-3 h-10 w-10 opacity-50" />
        <p>{t("ui.filesList.search.empty", { query })}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="bg-card px-4 py-2 text-xs text-muted-foreground">
        {t("ui.filesList.search.found", { count: results.length })}
      </div>
      <div className="max-h-[72vh] overflow-y-auto">
        <Table>
          <TableBody>
            {results.map((item, index) => (
              <FileItem
                key={`${item.path}-${index}`}
                file={item}
                index={index}
                pathHint={parentDir(item.path)}
                onNavigate={onNavigate}
                onEdit={onEdit}
                onDownload={onDownload}
                onExtract={onExtract}
                onDelete={onDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default FilesSearchResults;
