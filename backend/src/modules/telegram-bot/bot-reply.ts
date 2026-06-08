import type { InlineKeyboard } from "grammy";
import type { MyContext } from "./bot-types";

/**
 * Reply with a fresh message, or edit the message
 */
export async function replyOrEdit(
  ctx: MyContext,
  edit: boolean,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  const options = { parse_mode: "HTML" as const, reply_markup: keyboard };
  if (edit) {
    try {
      await ctx.editMessageText(text, options);
      return;
    } catch {
      // fall through to a fresh message when the original can't be edited
    }
  }
  await ctx.reply(text, options);
}

/** Escape user-provided text for safe inclusion in HTML-parsed messages */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
