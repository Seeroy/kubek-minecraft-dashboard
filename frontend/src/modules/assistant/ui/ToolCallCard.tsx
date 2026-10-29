"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Spinner } from "@/shared/ui/spinner";
import type { AssistantToolCall, AssistantToolCallStatus } from "@shared/types/assistant.types";
import { Ban, Check, ChevronRight, CircleAlert, Hourglass, Wrench, type LucideIcon } from "lucide-react";
import { memo } from "react";

const STATUS_ICON: Record<Exclude<AssistantToolCallStatus, "running">, { icon: LucideIcon; className: string }> = {
  pending: { icon: Hourglass, className: "text-warn" },
  done: { icon: Check, className: "text-success" },
  error: { icon: CircleAlert, className: "text-danger" },
  rejected: { icon: Ban, className: "text-muted-foreground" },
};

export function useToolLabel() {
  const { t } = useTranslation("modules.assistant.tools");
  return (name: string) => {
    const label = t(name);
    return label.startsWith("NOT TRANSLATED") ? name : label;
  };
}

function StatusIcon({ status }: { status: AssistantToolCallStatus }) {
  if (status === "running") return <Spinner className="size-3.5" />;
  const { icon: Icon, className } = STATUS_ICON[status];
  return <Icon className={`size-3.5 ${className}`} />;
}

/** Compact card of one tool call, expands to its arguments and result */
export const ToolCallCard = memo(function ToolCallCard({ call }: { call: AssistantToolCall }) {
  const { t } = useTranslation("modules.assistant.call");
  const label = useToolLabel();
  const args = Object.entries(call.args).filter(([key]) => key !== "serverId");

  return (
    <Collapsible className="overflow-hidden rounded-lg border border-border bg-card text-xs">
      <CollapsibleTrigger className="group/call flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-hover">
        <Wrench className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{label(call.name)}</span>
          <span className="ml-1.5 text-muted-foreground">{t(`status.${call.status}`)}</span>
        </span>
        <StatusIcon status={call.status} />
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-aria-expanded/call:rotate-90" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-2 border-t border-border px-3 py-2.5">
        {args.length > 0 && (
          <pre className="scrollbar-thin max-h-40 overflow-auto rounded-md bg-code px-2 py-1.5 font-mono text-[11px] text-code-foreground">
            {JSON.stringify(Object.fromEntries(args), null, 2)}
          </pre>
        )}
        <div className="grid gap-1">
          <span className="label-caps text-muted-foreground">{t("result")}</span>
          <pre className="scrollbar-thin max-h-56 overflow-auto rounded-md bg-code px-2 py-1.5 font-mono text-[11px] whitespace-pre-wrap text-code-foreground">
            {call.result ?? t("noResult")}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
