"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import type {
  AssistantPlan,
  AssistantPlanStep,
  AssistantToolCall,
} from "@shared/types/assistant.types";
import {
  Check,
  ChevronRight,
  Circle,
  CircleSlash,
  ListChecks,
} from "lucide-react";
import { useState } from "react";
import { useConfirmCall } from "../api/assistant.queries";

const finished = (step: AssistantPlanStep) =>
  step.status === "done" || step.status === "skipped";

export function planProgress(plan: AssistantPlan) {
  return { done: plan.steps.filter(finished).length, total: plan.steps.length };
}

function StepIcon({ status }: { status: AssistantPlanStep["status"] }) {
  switch (status) {
    case "in_progress":
      return <Spinner className="size-3.5 text-primary" />;
    case "done":
      return <Check className="size-3.5 text-success" aria-hidden />;
    case "skipped":
      return (
        <CircleSlash className="size-3.5 text-muted-foreground" aria-hidden />
      );
    default:
      return (
        <Circle className="size-3.5 text-muted-foreground/50" aria-hidden />
      );
  }
}

export function PlanSteps({
  steps,
  className,
}: {
  steps: AssistantPlanStep[];
  className?: string;
}) {
  const { t } = useTranslation("modules.assistant.plan");
  return (
    <ol className={cn("grid gap-0.5", className)}>
      {steps.map((step, i) => (
        <li
          key={`${i}:${step.text}`}
          data-status={step.status}
          className="grid grid-cols-[16px_minmax(0,1fr)] items-start gap-2.5 rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors duration-200 data-[status=in_progress]:bg-primary/6"
        >
          <span className="grid h-[18px] place-items-center">
            <StepIcon status={step.status} />
          </span>
          <span
            className={cn(
              "min-w-0 [overflow-wrap:anywhere]",
              step.status === "pending" && "text-muted-foreground",
              step.status === "in_progress" && "font-medium",
              step.status === "skipped" && "text-muted-foreground line-through"
            )}
          >
            {step.text}
            <span className="sr-only">, {t(`status.${step.status}`)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function PlanActions({
  conversationId,
  call,
}: {
  conversationId: string;
  call: AssistantToolCall;
}) {
  const { t } = useTranslation("modules.assistant.plan");
  const confirm = useConfirmCall(conversationId);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Errors are toasted by the query client already
  const decide = (approve: boolean, text?: string) =>
    confirm.mutate({
      callId: call.id,
      approve,
      response: text ? { text } : undefined,
    });

  if (editing) {
    return (
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (feedback.trim()) decide(false, feedback.trim());
        }}
      >
        <Textarea
          autoFocus
          value={feedback}
          maxLength={2000}
          placeholder={t("feedbackPlaceholder")}
          onChange={(event) => setFeedback(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="min-h-14 text-[13px]"
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            {t("back")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={confirm.isPending || !feedback.trim()}
          >
            {t("sendFeedback")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-2.5">
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={confirm.isPending}
          onClick={() => decide(false)}
        >
          {t("decline")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={confirm.isPending}
          onClick={() => setEditing(true)}
        >
          {t("change")}
        </Button>
        <Button
          size="sm"
          disabled={confirm.isPending}
          onClick={() => decide(true)}
        >
          {t("run")}
        </Button>
      </div>
    </div>
  );
}

/** A plan the assistant proposed, it waits for approval and then tracks its steps */
export function PlanCard({
  conversationId,
  call,
  plan,
}: {
  conversationId: string;
  call: AssistantToolCall;
  plan: AssistantPlan;
}) {
  const { t } = useTranslation("modules.assistant.plan");
  const pending = call.status === "pending";
  const declined = call.status === "rejected";
  const { done, total } = planProgress(plan);
  // A finished or declined plan folds away, the answer below matters more
  const [open, setOpen] = useState(
    () => pending || (!declined && done < total)
  );
  const state = pending
    ? t("awaiting")
    : declined
      ? t("declined")
      : t("approved");

  return (
    <Collapsible
      open={pending || open}
      onOpenChange={setOpen}
      className={cn(
        "grid animate-pop-in overflow-hidden rounded-xl border text-[13px]",
        pending
          ? "border-tone/30 bg-tone/8 tone-amber"
          : "border-border bg-card",
        declined && "opacity-70"
      )}
    >
      <CollapsibleTrigger
        disabled={pending}
        className="group/plan flex w-full min-w-0 items-center gap-2.5 p-3 text-left outline-none focus-visible:bg-hover enabled:hover:bg-hover/60"
      >
        <Plate
          size="sm"
          tone={pending ? "amber" : declined ? "gray" : "primary"}
        >
          <ListChecks />
        </Plate>
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-medium">{plan.title || t("title")}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {state}
            {!pending && !declined && ` · ${t("progress", done, total)}`}
          </span>
        </span>
        {!pending && (
          <ChevronRight
            className="size-3.5 shrink-0 text-muted-foreground transition-transform group-aria-expanded/plan:rotate-90"
            aria-hidden
          />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-3 px-3 pb-3">
        {plan.explanation && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {plan.explanation}
          </p>
        )}
        <PlanSteps steps={plan.steps} className="-mx-2" />
        {pending && <PlanActions conversationId={conversationId} call={call} />}
      </CollapsibleContent>
    </Collapsible>
  );
}
