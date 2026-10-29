"use client";
import { Spinner } from "@/shared/ui/spinner";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";

const DiffEditor = dynamic(() => import("../lib/monaco-diff"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-muted-foreground">
      <Spinner className="size-5" />
    </div>
  ),
});

const LANGUAGES: Record<string, string> = {
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  properties: "ini",
  cfg: "ini",
  conf: "ini",
  ini: "ini",
  xml: "xml",
  sh: "shell",
  js: "javascript",
  ts: "typescript",
  md: "markdown",
};

const languageOf = (path: string) => LANGUAGES[path.split(".").pop()?.toLowerCase() ?? ""] ?? "plaintext";

export function DiffPreview({ path, before, after }: { path: string; before: string; after: string }) {
  const { resolvedTheme } = useTheme();
  return (
    <div className="h-64 overflow-hidden rounded-md border border-border">
      <DiffEditor
        original={before}
        modified={after}
        language={languageOf(path)}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        options={{
          readOnly: true,
          renderSideBySide: false,
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: "off",
          scrollBeyondLastLine: false,
          hideUnchangedRegions: { enabled: true },
          automaticLayout: true,
        }}
      />
    </div>
  );
}
