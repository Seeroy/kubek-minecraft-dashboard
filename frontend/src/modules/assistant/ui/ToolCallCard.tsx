"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Spinner } from "@/shared/ui/spinner";
import type { AssistantToolCall, AssistantToolCallStatus } from "@shared/types/assistant.types";
import { Ban, Check, ChevronRight, CircleAlert, Hourglass, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
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

function CallDetails({ call }: { call: AssistantToolCall }) {
  const { t } = useTranslation("modules.assistant.call");
  const args = Object.entries(call.args).filter(([key]) => key !== "serverId");
  return (
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
  );
}

/** One tool call as a slim row, expands to its arguments and result */
const CallRow = memo(function CallRow({ call, nested }: { call: AssistantToolCall; nested?: boolean }) {
  const { t } = useTranslation("modules.assistant.call");
  const label = useToolLabel();
  return (
    <Collapsible>
      <CollapsibleTrigger
        className={cn(
          "group/call flex w-full min-w-0 items-center gap-2 text-left transition-colors hover:bg-hover",
          nested ? "px-3 py-1.5 pl-4" : "px-3 py-2"
        )}
      >
        {nested ? <StatusIcon status={call.status} /> : <Wrench className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
        <span className="min-w-0 flex-1 truncate">
          <span className={cn(!nested && "font-medium", call.status === "running" && "text-shimmer")}>{label(call.name)}</span>
          <span className="ml-1.5 text-muted-foreground">{t(`status.${call.status}`)}</span>
        </span>
        {!nested && <StatusIcon status={call.status} />}
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-aria-expanded/call:rotate-90" aria-hidden />
      </CollapsibleTrigger>
      <CallDetails call={call} />
    </Collapsible>
  );
});

/** Back to back tool calls as one line with a summary, a single call stays a plain row */
export function ToolCallGroup({ calls }: { calls: AssistantToolCall[] }) {
  const { t } = useTranslation("modules.assistant.call");
  const label = useToolLabel();
  const box = "overflow-hidden rounded-lg border border-border bg-card text-xs";

  const only = calls.length === 1 ? calls[0] : undefined;
  if (only) {
    return (
      <div className={box}>
        <CallRow call={only} />
      </div>
    );
  }

  const running = calls.find((call) => call.status === "running");
  const done = calls.filter((call) => call.status === "done").length;
  const failed = calls.filter((call) => call.status === "error").length;
  const names = [...new Set(calls.map((call) => label(call.name)))].join(", ");

  return (
    <Collapsible className={box}>
      <CollapsibleTrigger className="group/calls flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-hover">
        <Wrench className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {running ? (
            <>
              <span className="text-shimmer font-medium">{label(running.name)}</span>
              <span className="ml-1.5 text-muted-foreground">{t("status.running")}</span>
            </>
          ) : (
            <>
              <span className="font-medium">{t("group", calls.length)}</span>
              <span className="ml-1.5 text-muted-foreground">{names}</span>
            </>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2 tabular-nums">
          {done > 0 && (
            <span className="inline-flex items-center gap-0.5 text-success" title={t("status.done")}>
              <Check className="size-3.5" aria-hidden />
              {done}
            </span>
          )}
          {failed > 0 && (
            <span className="inline-flex items-center gap-0.5 text-danger" title={t("status.error")}>
              <CircleAlert className="size-3.5" aria-hidden />
              {failed}
            </span>
          )}
          {running && <Spinner className="size-3.5" />}
        </span>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-aria-expanded/calls:rotate-90" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="divide-y divide-border border-t border-border">
        {calls.map((call) => (
          <CallRow key={call.id} call={call} nested />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
