"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel, PanelFoot, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Archive, FileText, HardDrive, Search } from "lucide-react";
import { useState } from "react";
import type { ILogFile } from "../types";

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

interface LogFilesProps {
  files: ILogFile[] | undefined;
  selected: string | undefined;
  onSelect: (name: string) => void;
}

function FileItem({ file, selected, onSelect }: { file: ILogFile; selected: boolean; onSelect: (name: string) => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(file.name)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-[7px] text-left transition-colors outline-none hover:bg-hover focus-visible:bg-hover",
        selected && "bg-primary/12 hover:bg-primary/12"
      )}
    >
      <Plate tone={file.gzipped ? "orange" : "blue"} size="sm">
        {file.gzipped ? <Archive /> : <FileText />}
      </Plate>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[12.5px] font-medium">{file.name}</span>
        <span className="block text-[11.5px] text-muted-foreground tabular-nums">
          {formatBytes(file.size)} · {dateFormat.format(new Date(file.modify))}
        </span>
      </span>
      {file.gzipped && <Badge className="tone-orange bg-tone/14 text-tone">GZ</Badge>}
    </button>
  );
}

export function LogFiles({ files, selected, onSelect }: LogFilesProps) {
  const { t } = useTranslation("modules.logViewer.files");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = (files ?? []).filter((file) => !q || file.name.toLowerCase().includes(q));
  const groups = [
    { key: "current", items: list.filter((file) => !file.gzipped) },
    { key: "archive", items: list.filter((file) => file.gzipped) },
  ].filter((group) => group.items.length > 0);
  const total = (files ?? []).reduce((sum, file) => sum + file.size, 0);

  return (
    <Panel className="min-h-0 overflow-hidden max-lg:max-h-72">
      <PanelHead>
        <Plate tone="blue" size="sm">
          <FileText />
        </Plate>
        <PanelTitle>{t("title")}</PanelTitle>
        <PanelMeta>{files?.length}</PanelMeta>
      </PanelHead>
      <div className="border-b border-border px-3 py-2">
        <InputGroup>
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} />
        </InputGroup>
      </div>
      <div role="listbox" aria-label={t("title")} className="min-h-0 flex-1 scrollbar-thin overflow-y-auto p-1">
        {!files ? (
          <div className="grid gap-1.5 p-1">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">{q ? t("noMatches", query.trim()) : t("empty")}</p>
        ) : (
          groups.map((group) => (
            <div key={group.key} role="group" aria-label={t(group.key)}>
              <div className="label-caps px-2 pt-3 pb-1">{t(group.key)}</div>
              {group.items.map((file) => (
                <FileItem key={file.name} file={file} selected={file.name === selected} onSelect={onSelect} />
              ))}
            </div>
          ))
        )}
      </div>
      <PanelFoot>
        <HardDrive className="size-3.5" />
        {t("total", formatBytes(total))}
      </PanelFoot>
    </Panel>
  );
}
