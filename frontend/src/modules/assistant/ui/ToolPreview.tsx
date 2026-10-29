"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { AssistantToolPreview } from "@shared/types/assistant.types";
import { ArrowRight } from "lucide-react";
import { DiffPreview } from "./DiffPreview";

export function ToolPreview({ preview }: { preview: AssistantToolPreview }) {
  const { t } = useTranslation("modules.assistant.confirm");

  switch (preview.type) {
    case "diff":
      return (
        <div className="grid gap-1.5">
          <div className="truncate font-mono text-xs text-muted-foreground">
            {preview.path}
            {preview.created && <span className="ml-2 text-success">{t("newFile")}</span>}
          </div>
          <DiffPreview path={preview.path} before={preview.before} after={preview.after} />
        </div>
      );
    case "command":
      return <pre className="scrollbar-thin overflow-x-auto rounded-md bg-code px-3 py-2 font-mono text-xs text-code-foreground">{preview.command}</pre>;
    case "properties":
      return (
        <ul className="grid gap-1 rounded-md bg-subtle px-3 py-2 font-mono text-xs">
          {preview.changes.map((change) => (
            <li key={change.key} className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="font-semibold">{change.key}</span>
              <span className="text-muted-foreground line-through">{change.before ?? t("unset")}</span>
              <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
              <span className="text-success">{change.after}</span>
            </li>
          ))}
        </ul>
      );
    case "summary":
      return (
        <div className="grid gap-0.5 rounded-md bg-subtle px-3 py-2 text-xs">
          <span className="font-medium">{preview.title}</span>
          {preview.lines.map((line) => (
            <span key={line} className="font-mono text-muted-foreground">
              {line}
            </span>
          ))}
        </div>
      );
  }
}
