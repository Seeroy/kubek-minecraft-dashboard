"use client";
import { CREATE_DIRECTORY_MODAL_ID, CREATE_FILE_MODAL_ID } from "@/modules/files/modals";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Progress } from "@/shared/ui/progress";
import { Archive, ChevronDown, FilePlus, FolderPlus, Plus, Trash2, Upload, X } from "lucide-react";
import { Fragment } from "react";
import FilesHint from "./FilesHint";

interface FilesBarProps {
  server: { id: string; name: string };
  breadcrumbParts: string[];
  currentPath: string;
  onNavigate: (path: string) => void;
  canWrite: boolean;
  canManage: boolean;
  onUpload: () => void;
  onCreated: () => void;
  uploadDisabled: boolean;
  selectionCount: number;
  onClearSelection: () => void;
  onDeleteSelection: () => void;
  onArchiveSelection: () => void;
  busy: { progress: number | null; message: string | null } | null;
}

const crumb =
  "inline-flex h-[30px] max-w-48 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70 aria-[current=page]:font-semibold aria-[current=page]:text-foreground";

export function FilesBar(props: FilesBarProps) {
  const { t } = useTranslation("modules.files.ui.files");
  const { open: openModal } = useModal();
  const { breadcrumbParts: parts } = props;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <nav aria-label={t("breadcrumb")} className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
        <button type="button" className={crumb} aria-current={parts.length === 0 ? "page" : undefined} onClick={() => props.onNavigate("")}>
          <ServerAvatar serverId={props.server.id} name={props.server.name} className="size-[18px] rounded-[4px]" />
          <span className="truncate">{props.server.name}</span>
        </button>
        {parts.map((part, index) => (
          <Fragment key={index}>
            <span aria-hidden className="text-muted-foreground/50">/</span>
            <button
              type="button"
              className={crumb}
              aria-current={index === parts.length - 1 ? "page" : undefined}
              onClick={() => props.onNavigate(parts.slice(0, index + 1).join("/"))}
            >
              <span className="truncate">{part}</span>
            </button>
          </Fragment>
        ))}
      </nav>

      {props.selectionCount > 0 ? (
        // Own row on mobile, otherwise the breadcrumb ends up under it
        <div className="flex animate-enter items-center gap-1.5 rounded-lg bg-primary/10 py-1 pr-1 pl-3 text-[13px] font-medium max-md:w-full">
          <span className="max-md:mr-auto">{t("selection.count", { count: props.selectionCount })}</span>
          {props.busy ? (
            <div className="flex w-48 items-center gap-2 px-2 text-xs text-muted-foreground">
              <Progress value={props.busy.progress ?? 0} className="flex-1" />
              <span className="tabular-nums">{props.busy.progress != null ? `${props.busy.progress}%` : "…"}</span>
            </div>
          ) : (
            <>
              {props.canManage && (
                <>
                  <Button variant="ghost" size="sm" onClick={props.onArchiveSelection}>
                    <Archive />
                    <span className="max-sm:sr-only">{t("selection.actions.archive")}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={props.onDeleteSelection}>
                    <Trash2 />
                    <span className="max-sm:sr-only">{t("selection.actions.delete")}</span>
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon-sm" onClick={props.onClearSelection} aria-label={t("selection.clear")} title={t("selection.clear")}>
                <X />
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {props.canWrite && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button />}>
                  <Plus />
                  {t("buttons.create")}
                  <ChevronDown className="size-3.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openModal(CREATE_FILE_MODAL_ID, { currentPath: props.currentPath, onCreated: props.onCreated })}>
                    <FilePlus />
                    {t("buttons.createFile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openModal(CREATE_DIRECTORY_MODAL_ID, { currentPath: props.currentPath, onCreated: props.onCreated })}>
                    <FolderPlus />
                    {t("buttons.createFolder")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={props.onUpload} disabled={props.uploadDisabled}>
                <Upload />
                <span className="hidden sm:inline">{t("buttons.upload")}</span>
              </Button>
            </>
          )}
          <FilesHint />
        </div>
      )}
    </div>
  );
}
