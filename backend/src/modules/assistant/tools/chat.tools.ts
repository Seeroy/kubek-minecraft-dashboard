import { Injectable } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import {
  ASSISTANT_ASK_TOOL,
  ASSISTANT_PLAN_TOOL,
  type AssistantCallResponse,
  type AssistantPlan,
  type AssistantQuestion,
  type AssistantQuestionAnswer,
  type AssistantToolPreview,
} from "@shared/types/assistant.types";
import { z } from "zod";
import { failure, text } from "./tool-args";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

const ANSWER_TEXT_LIMIT = 2000;

export const planArgs = z.object({
  title: z
    .string()
    .max(120)
    .optional()
    .describe("What the plan achieves, a few words. Needed for a new plan"),
  explanation: z
    .string()
    .max(600)
    .optional()
    .describe("Why this approach, one or two sentences"),
  steps: z
    .array(
      z.object({
        text: z.string().min(1).max(200).describe("One action, short"),
        status: z.enum(["pending", "in_progress", "done", "skipped"]),
      }),
    )
    .min(1)
    .max(12),
}) satisfies z.ZodType<AssistantPlan>;

export const questionArgs = z.object({
  question: z.string().min(1).max(300),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        description: z.string().max(200).optional(),
      }),
    )
    .max(6)
    .optional()
    .describe("Choices to pick from, leave out for a free text answer"),
  multiple: z.boolean().optional().describe("The user may pick several options"),
}) satisfies z.ZodType<AssistantQuestion>;

export const PLAN_APPROVED =
  "The user approved the plan. Carry it out step by step and mark each step with update_plan as you go, keep the step texts unchanged";
export const QUESTION_SKIPPED = "The user skipped the question, decide yourself or ask in plain text";

export const planDeclined = (feedback?: string) =>
  feedback?.trim()
    ? `The user declined the plan with this feedback: ${feedback.trim()}. Propose a revised plan with update_plan or ask what to change`
    : "The user declined the plan. Do not act on it, ask what to change";

const stepTexts = (plan: AssistantPlan) => plan.steps.map((step) => step.text.trim());

/** A new plan or changed steps go to the user, status updates of an approved plan do not */
export function planNeedsApproval(plan: AssistantPlan, approved: AssistantPlan | null): boolean {
  if (!approved) return true;
  const next = stepTexts(plan);
  const prev = stepTexts(approved);
  return next.length !== prev.length || next.some((step, i) => step !== prev[i]);
}

/** Answer checked against the options, null when there is nothing to send */
export function questionAnswer(
  question: AssistantQuestion,
  response: AssistantCallResponse | undefined,
): AssistantQuestionAnswer | null {
  const labels = new Set((question.options ?? []).map((option) => option.label));
  let selected = [...new Set(response?.selected ?? [])].filter((label) => labels.has(label));
  if (!question.multiple) selected = selected.slice(0, 1);
  const answer = response?.text?.trim().slice(0, ANSWER_TEXT_LIMIT) || null;
  if (!selected.length && !answer) return null;
  return { selected, text: answer };
}

// The preview marks a call the user decided on, older clients show it as a plain confirm card
export function planPreview(plan: AssistantPlan): AssistantToolPreview {
  return { type: "summary", title: plan.title || "Plan", lines: plan.steps.map((step, i) => `${i + 1}. ${step.text}`) };
}

export function questionPreview(question: AssistantQuestion): AssistantToolPreview {
  return {
    type: "summary",
    title: question.question,
    lines: (question.options ?? []).map((option) => option.label),
  };
}

/** Tools that talk to the user in the chat instead of touching servers */
@Injectable()
export class ChatTools implements ToolGroup {
  tools(): AssistantTool[] {
    return [this.plan(), this.ask()];
  }

  private plan() {
    return defineTool({
      name: ASSISTANT_PLAN_TOOL,
      description:
        "Show the user a step by step plan before a task with several actions, then keep its step statuses current. A new plan or changed steps wait for the user to approve, status updates apply right away. Call it alone, not together with other tools",
      kind: "plan",
      access: [AccessArea.ASSISTANT, "read"],
      serverScoped: false,
      args: planArgs,
      preview: (_ctx, plan) => Promise.resolve(planPreview(plan)),
      run: () => Promise.resolve(text("Plan updated")),
    });
  }

  private ask() {
    return defineTool({
      name: ASSISTANT_ASK_TOOL,
      description:
        "Ask the user a question when the request is ambiguous or they should choose between options (which server, version, plugin, approach). Give 2 to 5 short options when they fit. Do not ask what tools can find out. The answer comes back as JSON with selected labels and free text",
      kind: "ask",
      access: [AccessArea.ASSISTANT, "read"],
      serverScoped: false,
      args: questionArgs,
      preview: (_ctx, question) => Promise.resolve(questionPreview(question)),
      // Answered through a decision, never run directly
      run: () => Promise.resolve(failure("The question is answered by the user")),
    });
  }
}
