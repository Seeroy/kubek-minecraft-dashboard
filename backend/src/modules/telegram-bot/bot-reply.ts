import { getErrorMessage } from "@/core/utils/error";
import { Logger } from "@nestjs/common";
import { type Api, GrammyError, type InlineKeyboard } from "grammy";
import type { MyContext } from "./bot-types";

const logger = new Logger("TelegramBot");

/** Rich message plus a plain HTML version in case Telegram rejects it */
export interface RichView {
  html: string;
  fallback: string;
  /** Keyboard for the HTML version, the main one if not set */
  fallbackKeyboard?: InlineKeyboard;
}

/** Edit with the same content, Telegram treats it as an error */
export function isNotModified(error: unknown): boolean {
  return (
    error instanceof GrammyError &&
    error.description.includes("message is not modified")
  );
}

/** The user blocked the bot or deleted their account */
export function isUnreachable(error: unknown): boolean {
  return error instanceof GrammyError && error.error_code === 403;
}

let richRejectionLogged = false;

function logRichRejection(error: unknown) {
  if (richRejectionLogged) return;
  richRejectionLogged = true;
  logger.warn(
    `Rich message rejected, using HTML fallback: ${
      error instanceof GrammyError ? error.description : getErrorMessage(error)
    }`,
  );
}

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
    } catch (error) {
      if (isNotModified(error)) return;
      // fall through to a fresh message when the original can't be edited
    }
  }
  await ctx.reply(text, options);
}

/** replyOrEdit for rich messages, falls back to HTML */
export async function replyOrEditRich(
  ctx: MyContext,
  edit: boolean,
  view: RichView,
  keyboard?: InlineKeyboard,
): Promise<void> {
  const fallbackKeyboard = view.fallbackKeyboard ?? keyboard;
  if (edit) {
    try {
      await ctx.editMessageText(
        { html: view.html },
        { reply_markup: keyboard },
      );
      return;
    } catch (error) {
      if (isNotModified(error)) return;
      logRichRejection(error);
    }
    try {
      await ctx.editMessageText(view.fallback, {
        parse_mode: "HTML",
        reply_markup: fallbackKeyboard,
      });
      return;
    } catch (error) {
      if (isNotModified(error)) return;
    }
  }
  try {
    await ctx.replyWithRichMessage(
      { html: view.html },
      { reply_markup: keyboard },
    );
  } catch (error) {
    logRichRejection(error);
    await ctx.reply(view.fallback, {
      parse_mode: "HTML",
      reply_markup: fallbackKeyboard,
    });
  }
}

/** Send by chat id, throws only if the HTML version fails too */
export async function sendRich(
  api: Api,
  chatId: number,
  view: RichView,
  keyboard?: InlineKeyboard,
): Promise<{ message_id: number }> {
  try {
    return await api.sendRichMessage(
      chatId,
      { html: view.html },
      { reply_markup: keyboard },
    );
  } catch (error) {
    if (isUnreachable(error)) throw error;
    logRichRejection(error);
    return api.sendMessage(chatId, view.fallback, {
      parse_mode: "HTML",
      reply_markup: view.fallbackKeyboard ?? keyboard,
    });
  }
}
