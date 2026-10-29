"use client";
import type { NetworkFileChange } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { ChevronRight, FileCode2 } from "lucide-react";

const MARK = { add: "+", del: "-", same: " " } as const;

/** One file the wizard writes, folded to the changed lines */
export function FileDiff({ change, defaultOpen }: { change: NetworkFileChange; defaultOpen?: boolean }) {
  const { t } = useTranslation("modules.networks.review");
  const added = change.diff.filter((line) => line.op === "add").length;
  const removed = change.diff.filter((line) => line.op === "del").length;

  return (
    <Collapsible defaultOpen={defaultOpen} className="overflow-hidden rounded-lg border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center gap-2.5 px-3 py-2 text-left outline-none hover:bg-hover focus-visible:bg-hover">
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ease-smooth group-aria-expanded:rotate-90" />
        <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">
          <span className="text-muted-foreground">{change.serverName} / </span>
          {change.path}
        </span>
        <Badge variant={change.kind === "create" ? "success" : "secondary"}>{t(change.kind === "create" ? "created" : "updated")}</Badge>
        <span className="shrink-0 font-mono text-[11.5px] tabular-nums">
          <span className="text-success">+{added}</span> <span className="text-danger">-{removed}</span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="max-h-72 overflow-auto border-t border-border bg-subtle py-1 font-mono text-[11.5px] leading-5">
          {change.diff.map((line, index) =>
            line.op === "skip" ? (
              <div key={index} className="px-3 text-muted-foreground/80 italic select-none">
                {t("skipped", line.count)}
              </div>
            ) : (
              <div
                key={index}
                data-op={line.op}
                className="flex px-3 whitespace-pre data-[op=add]:bg-success/10 data-[op=add]:text-success data-[op=del]:bg-danger/10 data-[op=del]:text-danger"
              >
                <span aria-hidden className="w-4 shrink-0 select-none">
                  {MARK[line.op]}
                </span>
                {line.text || " "}
              </div>
            )
          )}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
