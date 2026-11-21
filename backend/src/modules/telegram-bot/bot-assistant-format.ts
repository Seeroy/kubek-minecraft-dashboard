import type {
  AssistantPlan,
  AssistantPlanStepStatus,
  AssistantQuestion,
  AssistantToolCall,
  AssistantToolCallStatus,
  AssistantToolPreview,
} from "@shared/types/assistant.types";
import { escapeHtml } from "./bot-format";
import { t, type TelegramLang } from "./i18n";

/** Telegram text messages stop at 4096 characters */
export const TELEGRAM_TEXT_LIMIT = 4096;
// Previews in a confirmation card, the card must stay well under the limit
const PREVIEW_CHARS = 2500;
const DIFF_LINES = 40;

const STATUS_ICON: Record<AssistantToolCallStatus, string> = {
  pending: "⏳",
  running: "⏳",
  done: "✅",
  error: "❌",
  rejected: "🚫",
};

export function toolLabel(lang: TelegramLang, name: string): string {
  const key = `assistant.tools.${name}`;
  const label = t(lang, key);
  return label === key ? name : label;
}

const STEP_ICON: Record<AssistantPlanStepStatus, string> = {
  pending: "▫️",
  in_progress: "⏳",
  done: "✅",
  skipped: "⏭",
};

const planOf = (call: AssistantToolCall) => call.args as unknown as AssistantPlan;

/** One line per call, plan updates fold into one progress line, null when nothing is worth a message */
export function renderToolLines(
  lang: TelegramLang,
  calls: AssistantToolCall[],
): string | null {
  const lines = calls
    .filter((call) => call.kind === "read" || call.kind === "write")
    .map((call) => `${STATUS_ICON[call.status]} ${escapeHtml(toolLabel(lang, call.name))}`);
  const update = calls.findLast((call) => call.kind === "plan" && !call.preview && call.status === "done");
  const steps = update ? planOf(update).steps ?? [] : [];
  if (update && steps.length) {
    const finished = steps.filter((step) => step.status === "done" || step.status === "skipped").length;
    // Updates may skip the title, the last call that had one names the plan
    const title = calls.findLast((call) => call.kind === "plan" && planOf(call).title)?.args.title;
    const name = typeof title === "string" ? title : t(lang, "assistant.tools.update_plan");
    lines.push(`📋 ${escapeHtml(name)}: ${finished}/${steps.length}`);
  }
  if (!lines.length) return null;
  return `<b>${t(lang, "assistant.toolsTitle")}</b>\n${lines.join("\n")}`;
}

/** Plan that waits for the user, steps as a numbered list */
export function renderPlanCard(lang: TelegramLang, plan: AssistantPlan): string {
  const steps = (plan.steps ?? []).map(
    (step, i) => `${STEP_ICON[step.status] ?? "▫️"} ${i + 1}. ${escapeHtml(step.text)}`,
  );
  return [
    t(lang, "assistant.planTitle"),
    `<b>${escapeHtml(plan.title ?? "")}</b>`,
    plan.explanation ? `<i>${escapeHtml(plan.explanation)}</i>` : null,
    "",
    ...steps,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** Question card, options go as buttons and a plain reply answers it too */
export function renderQuestionCard(lang: TelegramLang, question: AssistantQuestion): string {
  const options = (question.options ?? []).map((option, i) =>
    option.description
      ? `${i + 1}. <b>${escapeHtml(option.label)}</b>: ${escapeHtml(option.description)}`
      : `${i + 1}. <b>${escapeHtml(option.label)}</b>`,
  );
  return [
    t(lang, "assistant.questionTitle"),
    escapeHtml(question.question ?? ""),
    options.length ? `\n${options.join("\n")}` : null,
    `\n<i>${t(lang, options.length ? "assistant.questionHintOptions" : "assistant.questionHint")}</i>`,
  ]
    .filter(Boolean)
    .join("\n");
}

const clip = (text: string, limit: number) =>
  text.length > limit ? `${text.slice(0, limit)}\n...` : text;

/**
 * Changed lines only, enough to judge an edit in a chat. Common head and
 * tail are cut, so a one line change in a big file stays one line
 */
export function lineDiff(before: string, after: string): string {
  const a = before.split("\n");
  const b = after.split("\n");
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  )
    tail++;
  const removed = a.slice(head, a.length - tail).map((line) => `- ${line}`);
  const added = b.slice(head, b.length - tail).map((line) => `+ ${line}`);
  const lines = [...removed, ...added];
  const shown = lines.slice(0, DIFF_LINES);
  if (lines.length > shown.length) shown.push(`... +${lines.length - shown.length}`);
  return shown.join("\n");
}

function renderPreview(lang: TelegramLang, preview: AssistantToolPreview): string {
  switch (preview.type) {
    case "diff": {
      const note = preview.created ? ` (${t(lang, "assistant.newFile")})` : "";
      const diff = lineDiff(preview.before, preview.after);
      return `<code>${escapeHtml(preview.path)}</code>${note}\n<blockquote expandable>${escapeHtml(clip(diff, PREVIEW_CHARS))}</blockquote>`;
    }
    case "command":
      return `<pre>${escapeHtml(clip(preview.command, PREVIEW_CHARS))}</pre>`;
    case "properties":
      return preview.changes
        .map(
          (change) =>
            `<code>${escapeHtml(change.key)}</code>: ${escapeHtml(change.before ?? t(lang, "assistant.unset"))} → <b>${escapeHtml(change.after)}</b>`,
        )
        .join("\n");
    case "summary":
      return [
        `<b>${escapeHtml(preview.title)}</b>`,
        ...preview.lines.map((line) => escapeHtml(line)),
      ].join("\n");
  }
}

/** Card for a write call that waits for the user */
export function renderConfirmCard(
  lang: TelegramLang,
  call: AssistantToolCall,
  serverName?: string,
): string {
  const head = [
    t(lang, "assistant.confirmTitle"),
    `🔧 ${escapeHtml(toolLabel(lang, call.name))}`,
    serverName ? t(lang, "assistant.onServer", { name: escapeHtml(serverName) }) : null,
  ].filter(Boolean);
  const body = call.preview ? renderPreview(lang, call.preview) : "";
  return [...head, body].filter(Boolean).join("\n");
}

/** Splits plain text into message sized parts, on line breaks where possible */
export function chunkText(text: string, limit = TELEGRAM_TEXT_LIMIT): string[] {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const cut = rest.lastIndexOf("\n", limit);
    const at = cut > limit / 2 ? cut : limit;
    parts.push(rest.slice(0, at));
    rest = rest.slice(at).replace(/^\n/, "");
  }
  if (rest) parts.push(rest);
  return parts;
}
