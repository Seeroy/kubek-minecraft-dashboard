"use client";
import { usePlatformModifier } from "@/shared/hooks/usePlatformModifier";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { humanizeFileSize } from "@/shared/lib/bytesToGb";
import type { ModalProps } from "@/shared/types/modal.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Kbd } from "@/shared/ui/kbd";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { ExternalLink, FileText, Save } from "lucide-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useMemo, useRef, useState } from "react";

const MonacoEditor = dynamic(() => import("../lib/monaco"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-muted-foreground">
      <Spinner className="size-5" />
    </div>
  ),
});

export interface FileEditorProps {
  filename?: string;
  initialValue: string;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "files/editor": { props: FileEditorProps; result: string | null };
  }
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  php: "php",
  lua: "lua",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  ini: "ini",
  conf: "ini",
  properties: "ini",
  xml: "xml",
  html: "html",
  htm: "html",
  sql: "sql",
  csv: "csv",
  md: "markdown",
  markdown: "markdown",
  txt: "plaintext",
  log: "log",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  dockerfile: "dockerfile",
  docker: "dockerfile",
  gitignore: "plaintext",
  gitattributes: "plaintext",
};

const getLanguageFromFilename = (filename?: string): string => {
  if (!filename) return "plaintext";
  const extension = filename.split(".").pop()?.toLowerCase();
  return LANGUAGE_BY_EXTENSION[extension ?? ""] ?? "plaintext";
};

const encoder = new TextEncoder();

const EditorModal: React.FC<ModalProps<string | null> & FileEditorProps> = ({ isOpen, onClose, filename, initialValue }) => {
  const { t } = useTranslation("modules.files.modals.editor");
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { mod } = usePlatformModifier();
  // The modal mounts fresh for every open, so the initial value is enough
  const [value, setValue] = useState(initialValue);
  // Read by the Monaco save shortcut, which is bound once on mount
  const valueRef = useRef(initialValue);

  const language = getLanguageFromFilename(filename);
  const extension = filename?.split(".").pop()?.toUpperCase();
  const dirty = value !== initialValue;
  const size = useMemo(() => humanizeFileSize(encoder.encode(value).length), [value]);

  const openInLogViewer = () => {
    onClose(null);
    router.push(filename ? `/logs?file=${encodeURIComponent(filename)}` : "/logs");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(null)}>
      <DialogContent className="h-dvh max-h-none max-w-none rounded-none md:h-[min(640px,86vh)] md:max-w-[min(880px,calc(100%-2rem))] md:rounded-xl">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="blue" size="sm">
            <FileText />
          </Plate>
          <DialogTitle className="truncate font-mono text-[13px]">{filename ?? t("title")}</DialogTitle>
          {extension && <Badge variant="secondary">{extension}</Badge>}
          {dirty && <Badge variant="warning">{t("modified")}</Badge>}
        </DialogHeader>
        <DialogBody className="p-0">
          <MonacoEditor
            height="100%"
            language={language}
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
            value={value}
            onChange={(next) => {
              valueRef.current = next ?? "";
              setValue(valueRef.current);
            }}
            onMount={(editor, monaco) => {
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onClose(valueRef.current));
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </DialogBody>
        <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">{size} · UTF-8 · LF</span>
          <div className="flex items-center gap-2">
            {language === "log" && (
              <Button variant="ghost" size="sm" onClick={openInLogViewer}>
                <ExternalLink />
                {t("viewInLogViewer")}
              </Button>
            )}
            <Button variant="outline" onClick={() => onClose(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => onClose(value)} title={`${mod} S`}>
              <Save />
              {t("save.default")}
              <Kbd className="border-primary-foreground/30 bg-transparent text-primary-foreground/80">{mod === "⌘" ? "⌘S" : "Ctrl S"}</Kbd>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditorModal;
