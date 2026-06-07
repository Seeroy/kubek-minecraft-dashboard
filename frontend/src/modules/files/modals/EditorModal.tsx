"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { ExternalLink, FileText, Save } from "lucide-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      <div className="mr-3 h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
      Loading editor…
    </div>
  ),
});

export interface FileEditorProps {
  filename?: string;
  initialValue: string;
}

export const FILE_EDITOR_MODAL_ID = "files/editor";

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
  toml: "toml",
  ini: "ini",
  conf: "ini",
  properties: "properties",
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

const EditorModal: React.FC<ModalProps<string | null> & FileEditorProps> = ({
  isOpen,
  onClose,
  filename,
  initialValue,
}) => {
  const { t } = useTranslation("modules.files");
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  const monacoTheme = useMemo(() => {
    const effectiveTheme = resolvedTheme || theme || "light";
    return effectiveTheme === "dark" ? "vs-dark" : "light";
  }, [theme, resolvedTheme]);

  const language = useMemo(() => getLanguageFromFilename(filename), [filename]);
  const isLogFile = language === "log";

  const openInLogViewer = () => {
    onClose(null);
    router.push(
      filename ? `/logs?file=${encodeURIComponent(filename)}` : "/logs"
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(null)}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none p-0 md:h-[80vh] md:w-[80vw] md:max-w-none md:rounded-2xl">
        <DialogHeader className="px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="truncate">
                {filename ?? t("modals.editor.title")}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          <MonacoEditor
            height="100%"
            language={language}
            theme={monacoTheme}
            value={value}
            onChange={(v) => setValue(v ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
        <DialogFooter className="flex-row items-center justify-between gap-2 px-3 py-2 md:px-6 md:py-4">
          {isLogFile ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={openInLogViewer}
              className="text-muted-foreground md:h-9"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("modals.editor.viewInLogViewer")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onClose(null)}
              className="md:h-9"
            >
              {t("modals.editor.cancel")}
            </Button>
            <Button size="sm" onClick={() => onClose(value)} className="md:h-9">
              <Save className="mr-2 h-4 w-4" />
              {t("modals.editor.save.default")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function FileEditorModalRegistration() {
  useThisModal({
    id: FILE_EDITOR_MODAL_ID,
    component: EditorModal,
    module: "file-manager",
  });
  return null;
}

export default EditorModal;
