import { getErrorMessage } from "@/core/utils/error";
import { ConversationsService } from "@/modules/assistant/conversations/conversations.service";
import {
  AssistantEventsService,
  type AssistantRunEvent,
} from "@/modules/assistant/runner/assistant-events.service";
import { AssistantSettingsService } from "@/modules/assistant/settings/assistant-settings.service";
import { ServersService } from "@/modules/servers/servers.service";
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { can } from "@shared/access/can";
import {
  ASSISTANT_ATTACHMENT_LIMITS,
  ASSISTANT_RUN_ERRORS,
  type AssistantAttachmentInput,
  type AssistantToolCall,
  type IAssistantMessage,
} from "@shared/types/assistant.types";
import type { IUser } from "@shared/types/user.types";
import { type Bot, InlineKeyboard } from "grammy";
import type { ReactionTypeEmoji } from "grammy/types";
import { BotAccessService } from "./bot-access.service";
import {
  chunkText,
  renderConfirmCard,
  renderToolLines,
  TELEGRAM_TEXT_LIMIT,
} from "./bot-assistant-format";
import { isUnreachable } from "./bot-reply";
import type { MyContext } from "./bot-types";
import { t, type TelegramLang } from "./i18n";
import type { ITelegramUser } from "./telegram.types";

// Drafts are rate limited by Telegram, this keeps the stream smooth without hitting it
const DRAFT_INTERVAL_MS = 900;
// Photos of one album arrive as separate updates within a moment of each other
const ALBUM_WAIT_MS = 1000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const TEXT_FILE = /\.(txt|log|json|jsonc|ya?ml|xml|properties|toml|cfg|conf|ini|md|csv|env|sk|mcmeta|lang|sh|bat|cmd|ps1|js|ts|java|kt|py|lua|sql|html|css)$/i;

type Emoji = ReactionTypeEmoji["emoji"];

/** A chat turn being answered, events of its conversation land here */
interface ChatRun {
  chatId: number;
  telegramId: number;
  user: IUser;
  lang: TelegramLang;
  conversationId: string;
  userMessageId: number;
  /** Assistant message being streamed */
  stepId: string | null;
  text: string;
  draftId: number;
  draftTimer: ReturnType<typeof setTimeout> | null;
  /** A draft waits in the queue, later text joins it instead of queueing another */
  draftQueued: boolean;
  /** The "Thinking..." placeholder went out for this step */
  thinkingShown: boolean;
  tools: Map<string, AssistantToolCall>;
  toolsMessageId: number | null;
  /** Card text per pending call, the decision is appended to it */
  cards: Map<string, string>;
  failed: boolean;
  /** Telegram calls go out one after another, in event order */
  queue: Promise<void>;
  unsubscribe: () => void;
}

export interface BotAssistantInput {
  text: string;
  attachments?: AssistantAttachmentInput[];
  messageId: number;
}

/** The panel AI assistant as a Telegram chat, sharing conversations with the web panel */
@Injectable()
export class BotAssistantService {
  private readonly logger = new Logger(BotAssistantService.name);
  private bot: Bot<MyContext> | null = null;
  // Conversation and server context per Telegram user, kept until a restart or /new
  private readonly chats = new Map<number, string>();
  private readonly serverContext = new Map<number, string>();
  private readonly runs = new Map<string, ChatRun>();
  private readonly albums = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; files: AssistantAttachmentInput[]; text: string }
  >();

  constructor(
    private readonly conversations: ConversationsService,
    private readonly events: AssistantEventsService,
    private readonly settings: AssistantSettingsService,
    private readonly access: BotAccessService,
    private readonly servers: ServersService,
  ) {}

  setBot(bot: Bot<MyContext> | null): void {
    this.bot = bot;
  }

  /** The server the user last opened in the bot becomes the chat's context */
  rememberServer(telegramId: number, serverId: string): void {
    this.serverContext.set(telegramId, serverId);
  }

  /** Panel user allowed to chat, null when the assistant is not for them */
  userFor(tgUser: ITelegramUser): IUser | null {
    const user = this.access.getUser(tgUser.userId);
    return user && can(user, AccessArea.ASSISTANT, "read") ? user : null;
  }

  async newChat(ctx: MyContext, lang: TelegramLang, tgUser: ITelegramUser): Promise<void> {
    const conversationId = this.chats.get(tgUser.id);
    if (conversationId) this.detach(conversationId);
    this.chats.delete(tgUser.id);
    await ctx.reply(t(lang, "assistant.newChat"));
  }

  /** Sends a user message to the assistant, false when the user has no access */
  async handleMessage(
    ctx: MyContext,
    lang: TelegramLang,
    tgUser: ITelegramUser,
    input: BotAssistantInput,
  ): Promise<boolean> {
    const user = this.userFor(tgUser);
    if (!user) return false;
    if (!this.settings.isConfigured()) {
      await ctx.reply(t(lang, "assistant.unavailable"));
      return true;
    }
    const chatId = ctx.chat?.id ?? tgUser.id;
    await this.react(chatId, input.messageId, "👀");

    const payload = {
      content: input.text.slice(0, 8000),
      serverId: this.serverContext.get(tgUser.id),
      attachments: input.attachments,
      autoApprove: false,
    };
    const previous = this.chats.get(tgUser.id);
    let conversationId: string;
    try {
      let result;
      try {
        result = this.conversations.send(user, { ...payload, conversationId: previous });
      } catch (err) {
        // Deleted in the web panel, start over
        if (!(err instanceof NotFoundException) || !previous) throw err;
        this.detach(previous);
        result = this.conversations.send(user, payload);
      }
      conversationId = result.conversation.id;
    } catch (err) {
      await this.react(chatId, input.messageId, "😢");
      await ctx.reply(this.describeSendError(lang, err));
      return true;
    }

    this.chats.set(tgUser.id, conversationId);
    this.attach({ chatId, telegramId: tgUser.id, user, lang, conversationId, userMessageId: input.messageId });
    return true;
  }

  /** Photos of an album come one by one, they go to the model as one message */
  handleAlbumPart(
    ctx: MyContext,
    lang: TelegramLang,
    tgUser: ITelegramUser,
    groupId: string,
    file: AssistantAttachmentInput,
    caption: string,
    messageId: number,
  ): void {
    const album = this.albums.get(groupId);
    if (album) clearTimeout(album.timer);
    const files = [...(album?.files ?? []), file];
    const text = album?.text || caption;
    const timer = setTimeout(() => {
      this.albums.delete(groupId);
      void this.handleMessage(ctx, lang, tgUser, {
        text,
        attachments: files.slice(0, ASSISTANT_ATTACHMENT_LIMITS.images),
        messageId,
      });
    }, ALBUM_WAIT_MS);
    this.albums.set(groupId, { timer, files, text });
  }

  /** Downloads a photo or document into an attachment, or says why it cannot be one */
  async readFile(
    lang: TelegramLang,
    file: { file_id: string; file_size?: number },
    name: string,
    mime: string | undefined,
  ): Promise<AssistantAttachmentInput | string> {
    const isImage = !!mime && IMAGE_TYPES.has(mime);
    const isText = !isImage && ((mime?.startsWith("text/") ?? false) || TEXT_FILE.test(name));
    if (!isImage && !isText) return t(lang, "assistant.fileUnsupported", { name });
    // Base64 grows by a third, text is counted in characters
    const maxBytes = isImage
      ? (ASSISTANT_ATTACHMENT_LIMITS.imageChars / 4) * 3
      : ASSISTANT_ATTACHMENT_LIMITS.textChars * 4;
    if ((file.file_size ?? 0) > maxBytes) return t(lang, "assistant.fileTooLarge", { name });

    let data: Buffer;
    try {
      data = await this.download(file.file_id);
    } catch (err) {
      return t(lang, "assistant.failed", { error: getErrorMessage(err) });
    }
    if (isImage && mime) return { kind: "image", name, mime, data: data.toString("base64") };
    const text = data.toString("utf8");
    if (text.includes("\u0000")) return t(lang, "assistant.fileUnsupported", { name });
    if (text.length > ASSISTANT_ATTACHMENT_LIMITS.textChars) return t(lang, "assistant.fileTooLarge", { name });
    return { kind: "text", name, mime: "text/plain", data: text };
  }

  /** The stop button under a draft */
  handleStopped(chatId: number): void {
    const run = [...this.runs.values()].find((item) => item.chatId === chatId);
    if (run) this.stop(run);
  }

  /** ai:y:<callId>, ai:n:<callId> and ai:stop, the query is answered here */
  async onCallback(ctx: MyContext, lang: TelegramLang, tgUser: ITelegramUser, rest: string): Promise<void> {
    const user = this.userFor(tgUser);
    const conversationId = this.chats.get(tgUser.id);
    const run = conversationId ? this.runs.get(conversationId) : undefined;
    if (!user || !conversationId) {
      await ctx.answerCallbackQuery(t(lang, "assistant.alreadyDecided"));
      await ctx.editMessageReplyMarkup().catch(() => undefined);
      return;
    }
    if (rest === "stop") {
      if (run) this.stop(run);
      await ctx.answerCallbackQuery();
      return;
    }

    const [verdict, callId] = rest.split(":");
    const approve = verdict === "y";
    try {
      this.conversations.confirm(user, conversationId, callId, approve, { autoApprove: false });
    } catch (err) {
      await ctx.answerCallbackQuery(
        err instanceof ConflictException || err instanceof NotFoundException
          ? t(lang, "assistant.alreadyDecided")
          : t(lang, "common.error"),
      );
      await ctx.editMessageReplyMarkup().catch(() => undefined);
      return;
    }
    await ctx.answerCallbackQuery(t(lang, approve ? "assistant.approved" : "assistant.denied"));
    const card = run?.cards.get(callId);
    const verdictLine = t(lang, approve ? "assistant.approved" : "assistant.denied");
    if (card) {
      run?.cards.delete(callId);
      await ctx.editMessageText(`${card}\n\n${verdictLine}`, { parse_mode: "HTML" }).catch(() => undefined);
    } else {
      await ctx.editMessageReplyMarkup().catch(() => undefined);
    }
  }

  // Keeps one run state per conversation, a new user message starts a fresh turn in it
  private attach(init: Pick<ChatRun, "chatId" | "telegramId" | "user" | "lang" | "conversationId" | "userMessageId">): void {
    const existing = this.runs.get(init.conversationId);
    if (existing) {
      Object.assign(existing, init, {
        stepId: null,
        text: "",
        thinkingShown: false,
        tools: new Map(),
        toolsMessageId: null,
        failed: false,
      });
      return;
    }
    const run: ChatRun = {
      ...init,
      stepId: null,
      text: "",
      draftId: 0,
      draftTimer: null,
      draftQueued: false,
      thinkingShown: false,
      tools: new Map(),
      toolsMessageId: null,
      cards: new Map(),
      failed: false,
      queue: Promise.resolve(),
      unsubscribe: () => {},
    };
    run.unsubscribe = this.events.on(init.conversationId, (event) => this.onEvent(run, event));
    this.runs.set(init.conversationId, run);
  }

  private detach(conversationId: string): void {
    const run = this.runs.get(conversationId);
    if (!run) return;
    if (run.draftTimer) clearTimeout(run.draftTimer);
    run.unsubscribe();
    this.runs.delete(conversationId);
  }

  private onEvent(run: ChatRun, event: AssistantRunEvent): void {
    switch (event.type) {
      case "delta":
        if (run.stepId !== event.messageId) this.newStep(run, event.messageId);
        if (event.channel === "reasoning") {
          // An empty draft is Telegram's own "Thinking..." placeholder, once per step is enough
          if (!run.text && !run.thinkingShown) {
            run.thinkingShown = true;
            this.queueDraft(run);
          }
          return;
        }
        run.text += event.text;
        this.scheduleDraft(run);
        return;
      case "message":
        this.onMessage(run, event.message);
        return;
      case "tool":
        run.tools.set(event.call.id, event.call);
        this.enqueue(run, () => this.showTools(run));
        return;
      case "confirm":
        run.tools.set(event.call.id, event.call);
        this.enqueue(run, async () => {
          await this.showTools(run);
          await this.sendCard(run, event.call);
        });
        return;
      case "done":
        this.stopDraft(run);
        this.enqueue(run, async () => {
          await this.showTools(run, false);
          if (event.finished && !run.failed) await this.react(run.chatId, run.userMessageId, "👍");
        });
        return;
      case "error": {
        // A failed request also saves a message with the error, that one is already shown
        const shown = run.failed;
        run.failed = true;
        this.stopDraft(run);
        this.enqueue(run, async () => {
          await this.showTools(run, false);
          if (!shown) await this.sendText(run, t(run.lang, "assistant.failed", { error: event.error }));
          await this.react(run.chatId, run.userMessageId, "😢");
        });
      }
    }
  }

  private onMessage(run: ChatRun, message: IAssistantMessage): void {
    if (message.role !== "assistant") return;
    this.stopDraft(run);
    for (const call of message.toolCalls) run.tools.set(call.id, call);
    const { content, error } = message;
    run.stepId = null;
    run.text = "";
    // Set right away, the error event follows this message before the queue gets to it
    const failed = !!error && error !== ASSISTANT_RUN_ERRORS.stopped;
    if (failed) run.failed = true;
    this.enqueue(run, async () => {
      if (content) await this.sendAnswer(run, content);
      if (message.toolCalls.length) await this.showTools(run);
      if (error) await this.sendText(run, this.describeRunError(run.lang, error));
      if (failed) await this.react(run.chatId, run.userMessageId, "😢");
    });
  }


  private newStep(run: ChatRun, messageId: string): void {
    this.stopDraft(run);
    run.stepId = messageId;
    run.text = "";
    run.thinkingShown = false;
    // Draft ids only have to differ between steps, a fresh id restarts the animation
    run.draftId = (run.draftId % 1_000_000_000) + 1;
  }

  private scheduleDraft(run: ChatRun): void {
    if (run.draftTimer || run.draftQueued) return;
    run.draftTimer = setTimeout(() => {
      run.draftTimer = null;
      this.queueDraft(run);
    }, DRAFT_INTERVAL_MS);
  }

  // Text is read when the call goes out, so a slow Telegram never builds up a backlog of drafts
  private queueDraft(run: ChatRun): void {
    if (run.draftQueued) return;
    run.draftQueued = true;
    const step = run.stepId;
    this.enqueue(run, async () => {
      run.draftQueued = false;
      // The step was saved meanwhile, its final message replaces the draft
      if (run.stepId !== step) return;
      // The tail is what is being written, the head is already read
      const text = run.text.length > TELEGRAM_TEXT_LIMIT ? run.text.slice(-TELEGRAM_TEXT_LIMIT) : run.text;
      await this.draft(run, text);
    });
  }

  private stopDraft(run: ChatRun): void {
    if (run.draftTimer) clearTimeout(run.draftTimer);
    run.draftTimer = null;
  }

  private async draft(run: ChatRun, text: string): Promise<void> {
    await this.bot?.api
      .sendMessageDraft(run.chatId, run.draftId || 1, text, { can_stop: true, keep_on_stop: true })
      .catch(() => undefined);
  }

  // Markdown goes as a rich message, Telegram renders it itself, plain text if it refuses
  private async sendAnswer(run: ChatRun, markdown: string): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.api.sendRichMessage(run.chatId, { markdown });
    } catch (err) {
      if (isUnreachable(err)) return;
      for (const part of chunkText(markdown)) await this.sendText(run, part, false);
    }
  }

  private async sendText(run: ChatRun, text: string, html = false): Promise<void> {
    await this.bot?.api
      .sendMessage(run.chatId, text, html ? { parse_mode: "HTML" } : {})
      .catch((err) => this.logger.warn(`Assistant reply failed: ${getErrorMessage(err)}`));
  }

  // One message lists the run's tool calls and carries the stop button while it runs
  private async showTools(run: ChatRun, running = true): Promise<void> {
    if (!this.bot || !run.tools.size) return;
    const text = renderToolLines(run.lang, [...run.tools.values()]);
    const keyboard = running ? new InlineKeyboard().text(t(run.lang, "assistant.stop"), "ai:stop") : undefined;
    if (run.toolsMessageId) {
      await this.bot.api
        .editMessageText(run.chatId, run.toolsMessageId, text, { parse_mode: "HTML", reply_markup: keyboard })
        .catch(() => undefined);
      return;
    }
    const sent = await this.bot.api
      .sendMessage(run.chatId, text, { parse_mode: "HTML", reply_markup: keyboard })
      .catch(() => null);
    run.toolsMessageId = sent?.message_id ?? null;
  }

  private async sendCard(run: ChatRun, call: AssistantToolCall): Promise<void> {
    if (!this.bot) return;
    const serverName = call.serverId ? this.servers.findById(call.serverId)?.name : undefined;
    const text = renderConfirmCard(run.lang, call, serverName);
    run.cards.set(call.id, text);
    const keyboard = new InlineKeyboard()
      .text(t(run.lang, "assistant.approve"), `ai:y:${call.id}`)
      .success()
      .text(t(run.lang, "assistant.deny"), `ai:n:${call.id}`)
      .danger();
    await this.bot.api
      .sendMessage(run.chatId, text, { parse_mode: "HTML", reply_markup: keyboard })
      .catch((err) => this.logger.warn(`Confirmation card failed: ${getErrorMessage(err)}`));
  }

  private stop(run: ChatRun): void {
    try {
      this.conversations.stop(run.user, run.conversationId);
    } catch {
      // Gone already, nothing to stop
    }
  }

  private enqueue(run: ChatRun, task: () => Promise<void>): void {
    run.queue = run.queue.then(task).catch((err) => this.logger.warn(`Assistant chat update failed: ${getErrorMessage(err)}`));
  }

  // Reactions are a nicety, a chat that does not allow them is fine
  private async react(chatId: number, messageId: number, emoji: Emoji): Promise<void> {
    await this.bot?.api.setMessageReaction(chatId, messageId, [{ type: "emoji", emoji }]).catch(() => undefined);
  }

  private async download(fileId: string): Promise<Buffer> {
    if (!this.bot) throw new Error("Bot is not running");
    const file = await this.bot.api.getFile(fileId);
    const res = await fetch(`https://api.telegram.org/file/bot${this.bot.token}/${file.file_path}`);
    if (!res.ok) throw new Error(`Telegram file download failed with ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  private describeSendError(lang: TelegramLang, err: unknown): string {
    if (err instanceof ConflictException) {
      const message = getErrorMessage(err);
      return t(lang, /pending/i.test(message) ? "assistant.pending" : "assistant.busy");
    }
    return t(lang, "assistant.failed", { error: getErrorMessage(err) });
  }

  private describeRunError(lang: TelegramLang, error: string): string {
    if (error === ASSISTANT_RUN_ERRORS.stopped) return t(lang, "assistant.stopped");
    if (error === ASSISTANT_RUN_ERRORS.stepLimit) return t(lang, "assistant.stepLimit");
    return t(lang, "assistant.failed", { error });
  }
}
