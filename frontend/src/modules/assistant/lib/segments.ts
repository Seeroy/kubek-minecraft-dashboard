import type { AssistantPlan, AssistantToolCall, AssistantUsage, IAssistantMessage } from "@shared/types/assistant.types";
import { addUsage } from "./usage";

type Billed = { usage: AssistantUsage | null };

export type ChatSegment =
  | { kind: "user"; key: string; message: IAssistantMessage }
  | { kind: "reasoning"; key: string; text: string; ms: number | null }
  | ({ kind: "text"; key: string; message: IAssistantMessage } & Billed)
  | ({ kind: "calls"; key: string; calls: AssistantToolCall[] } & Billed)
  | { kind: "confirm"; key: string; message: IAssistantMessage; call: AssistantToolCall }
  /** A plan the user was asked about, plan holds the latest step statuses */
  | { kind: "plan"; key: string; message: IAssistantMessage; call: AssistantToolCall; plan: AssistantPlan }
  | { kind: "ask"; key: string; message: IAssistantMessage; call: AssistantToolCall }
  | ({ kind: "error"; key: string; error: string } & Billed);

type PlanSegment = Extract<ChatSegment, { kind: "plan" }>;

const sameSteps = (a: AssistantPlan, b: AssistantPlan) =>
  a.steps.length === b.steps.length && a.steps.every((step, i) => step.text.trim() === b.steps[i]?.text.trim());

/** Flattens messages into blocks, back to back tool calls end up in one group even across messages */
export function toSegments(messages: IAssistantMessage[]): ChatSegment[] {
  const out: ChatSegment[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      out.push({ kind: "user", key: message.id, message });
      continue;
    }
    // The request's cost goes under the last block this message produced
    let billed: Billed | null = null;
    if (message.reasoning) out.push({ kind: "reasoning", key: `${message.id}:reasoning`, text: message.reasoning, ms: message.reasoningMs });
    if (message.content) {
      const text: ChatSegment = { kind: "text", key: message.id, message, usage: null };
      out.push(text);
      billed = text;
    }
    for (const call of message.toolCalls) {
      // A malformed plan or question shows as a failed call
      const talks = (call.kind === "plan" || call.kind === "ask") && call.status !== "error";
      if (talks && call.kind === "ask") {
        out.push({ kind: "ask", key: call.id, message, call });
        continue;
      }
      if (talks) {
        const plan = call.args as unknown as AssistantPlan;
        // Only plans that went to the user carry a preview, status updates fold into the card
        if (call.preview) {
          out.push({ kind: "plan", key: call.id, message, call, plan });
          continue;
        }
        const card = out.findLast((segment): segment is PlanSegment => segment.kind === "plan");
        // Only statuses move on, the title and explanation stay from the approved version
        if (card && sameSteps(card.plan, plan)) card.plan = { ...card.plan, steps: plan.steps };
        continue;
      }
      if (call.status === "pending") {
        out.push({ kind: "confirm", key: call.id, message, call });
        continue;
      }
      const last = out.at(-1);
      if (last?.kind === "calls") {
        last.calls.push(call);
        billed = last;
      } else {
        const calls: ChatSegment = { kind: "calls", key: call.id, calls: [call], usage: null };
        out.push(calls);
        billed = calls;
      }
    }
    if (message.error) {
      const error: ChatSegment = { kind: "error", key: `${message.id}:error`, error: message.error, usage: null };
      out.push(error);
      billed = error;
    }
    if (billed) billed.usage = addUsage(billed.usage, message.usage);
  }
  return out;
}

/** Latest approved plan while some of its steps are still open */
export function activePlan(segments: ChatSegment[]): AssistantPlan | null {
  const card = segments.findLast((segment): segment is PlanSegment => segment.kind === "plan");
  if (!card || card.call.status !== "done") return null;
  const open = card.plan.steps.some((step) => step.status === "pending" || step.status === "in_progress");
  return open ? card.plan : null;
}
