"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Plate } from "@/shared/ui/plate";
import { Textarea } from "@/shared/ui/textarea";
import type {
  AssistantQuestion,
  AssistantQuestionAnswer,
  AssistantToolCall,
} from "@shared/types/assistant.types";
import { Check, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";
import { useConfirmCall } from "../api/assistant.queries";

function parseAnswer(result: string | null): AssistantQuestionAnswer | null {
  if (!result) return null;
  try {
    const value = JSON.parse(result) as Partial<AssistantQuestionAnswer>;
    return {
      selected: Array.isArray(value.selected) ? value.selected : [],
      text: value.text ?? null,
    };
  } catch {
    return null;
  }
}

function QuestionForm({
  conversationId,
  call,
  question,
}: {
  conversationId: string;
  call: AssistantToolCall;
  question: AssistantQuestion;
}) {
  const { t } = useTranslation("modules.assistant.question");
  const confirm = useConfirmCall(conversationId);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const options = question.options ?? [];
  const canSend = selected.length > 0 || !!text.trim();

  const toggle = (label: string) =>
    setSelected((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : question.multiple
          ? [...current, label]
          : [label]
    );

  // Errors are toasted by the query client already
  const submit = () => {
    if (canSend)
      confirm.mutate({
        callId: call.id,
        approve: true,
        response: { selected, text: text.trim() || undefined },
      });
  };

  return (
    <form
      className="grid gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {options.length > 0 && (
        <div
          role={question.multiple ? "group" : "radiogroup"}
          aria-label={question.question}
          className="grid gap-1.5"
        >
          {options.map((option) => {
            const active = selected.includes(option.label);
            return (
              <button
                key={option.label}
                type="button"
                role={question.multiple ? "checkbox" : "radio"}
                aria-checked={active}
                onClick={() => toggle(option.label)}
                className={cn(
                  "group/opt grid grid-cols-[16px_minmax(0,1fr)] items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors duration-150 ease-smooth outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]",
                  active
                    ? "border-primary/50 bg-primary/8"
                    : "border-border bg-card hover:border-primary/30 hover:bg-primary/4"
                )}
              >
                <span
                  className={cn(
                    "mt-px grid size-4 place-items-center border transition-colors",
                    question.multiple ? "rounded-[4px]" : "rounded-full",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                  aria-hidden
                >
                  {active && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="font-medium [overflow-wrap:anywhere]">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <Textarea
        value={text}
        maxLength={2000}
        placeholder={options.length ? t("otherPlaceholder") : t("placeholder")}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            submit();
          }
        }}
        className="min-h-9 text-[13px]"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={confirm.isPending}
          onClick={() => confirm.mutate({ callId: call.id, approve: false })}
        >
          {t("skip")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={confirm.isPending || !canSend}
        >
          {t("answer")}
        </Button>
      </div>
    </form>
  );
}

/** A question from the assistant, the run goes on once it is answered or skipped */
export function QuestionCard({
  conversationId,
  call,
}: {
  conversationId: string;
  call: AssistantToolCall;
}) {
  const { t } = useTranslation("modules.assistant.question");
  const question = call.args as unknown as AssistantQuestion;
  const pending = call.status === "pending";
  const answer = call.status === "done" ? parseAnswer(call.result) : null;

  return (
    <div
      className={cn(
        "grid animate-pop-in gap-3 rounded-xl border p-3 text-[13px]",
        pending
          ? "border-tone/30 bg-tone/8 tone-primary"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-2.5">
        <Plate size="sm" tone={pending ? "primary" : "gray"}>
          <MessageCircleQuestion />
        </Plate>
        <div className="grid min-w-0 gap-0.5 pt-0.5">
          <p className="leading-snug font-medium [overflow-wrap:anywhere]">
            {question.question}
          </p>
          {pending && question.multiple && (
            <p className="text-xs text-muted-foreground">{t("multiple")}</p>
          )}
        </div>
      </div>
      {pending && (
        <QuestionForm
          conversationId={conversationId}
          call={call}
          question={question}
        />
      )}
      {answer && (
        <div className="ml-9 grid justify-items-start gap-1.5">
          {answer.selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {answer.selected.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium"
                >
                  <Check className="size-3 text-primary" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          )}
          {answer.text && (
            <p className="text-xs [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
              {answer.text}
            </p>
          )}
        </div>
      )}
      {call.status === "rejected" && (
        <p className="ml-9 text-xs text-muted-foreground">{t("skipped")}</p>
      )}
    </div>
  );
}
