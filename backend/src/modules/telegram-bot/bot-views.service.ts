import { AccountsService } from "@/modules/accounts/accounts.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { ServersService } from "@/modules/servers/servers.service";
import { Injectable } from "@nestjs/common";
import {
  AuditAction,
  AuditCategory,
  AuditResult,
} from "@shared/types/audit.types";
import type { ITelegramUser, TelegramLang } from "@/modules/telegram-bot/telegram.types";
import { BotAccessService } from "./bot-access.service";
import { renderServersList, renderServerStatus } from "./bot-format";
import {
  mainMenuKeyboard,
  serversNavKeyboard,
  statusKeyboard,
} from "./bot-keyboards";
import { replyOrEdit } from "./bot-reply";
import type { MyContext } from "./bot-types";
import { BotUsersService } from "./bot-users.service";
import { t } from "./i18n";

type ServerControlAction = "start" | "stop" | "restart";

const CONTROL_AUDIT_ACTION: Record<ServerControlAction, string> = {
  start: AuditAction.SERVER_START,
  stop: AuditAction.SERVER_STOP,
  restart: AuditAction.SERVER_RESTART,
};

/**
 * Renders the interactive views (menu, servers list, status) and runs the
 * server control actions triggered from inline keyboards
 */
@Injectable()
export class BotViewsService {
  private readonly SERVERS_PER_PAGE = 5;

  constructor(
    private readonly accountsService: AccountsService,
    private readonly serversService: ServersService,
    private readonly access: BotAccessService,
    private readonly auditLog: AuditLogService,
    private readonly users: BotUsersService,
  ) {}

  async sendMainMenu(
    ctx: MyContext,
    lang: TelegramLang,
    edit: boolean,
  ): Promise<void> {
    const tgUser = this.users.getActiveUser(ctx);
    const canCreate = tgUser ? this.access.canCreate(tgUser.userId) : false;
    await replyOrEdit(
      ctx,
      edit,
      t(lang, "menu.text"),
      mainMenuKeyboard(lang, canCreate),
    );
  }

  async sendServersPage(
    ctx: MyContext,
    lang: TelegramLang,
    userId: string,
    page: number,
    edit: boolean,
  ): Promise<void> {
    let servers;
    try {
      servers = this.access.visibleServers(
        userId,
        this.serversService.findAll(),
      );
    } catch (error) {
      console.error("[TelegramBot] Error fetching servers:", error);
      return void replyOrEdit(ctx, edit, t(lang, "servers.fetchError"));
    }

    if (servers.length === 0)
      return void replyOrEdit(ctx, edit, t(lang, "servers.none"));

    const totalPages = Math.ceil(servers.length / this.SERVERS_PER_PAGE);
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);
    const start = safePage * this.SERVERS_PER_PAGE;
    const pageServers = servers.slice(start, start + this.SERVERS_PER_PAGE);

    await replyOrEdit(
      ctx,
      edit,
      renderServersList(lang, pageServers, safePage, totalPages),
      serversNavKeyboard(lang, safePage, totalPages),
    );
  }

  async sendServerStatus(
    ctx: MyContext,
    lang: TelegramLang,
    userId: string,
    serverId: string,
    edit: boolean,
  ): Promise<void> {
    try {
      const server = this.serversService.findById(serverId);
      if (!server)
        return void replyOrEdit(ctx, edit, t(lang, "status.notFound"));
      if (!this.access.canView(userId, serverId)) {
        return void replyOrEdit(ctx, edit, t(lang, "status.noPermissionView"));
      }
      await replyOrEdit(
        ctx,
        edit,
        renderServerStatus(lang, server),
        statusKeyboard(
          lang,
          serverId,
          this.access.canControl(userId, serverId),
        ),
      );
    } catch (error) {
      console.error("[TelegramBot] Error fetching status:", error);
      await replyOrEdit(ctx, edit, t(lang, "status.fetchError"));
    }
  }

  async handleServerAction(
    ctx: MyContext,
    lang: TelegramLang,
    tgUser: ITelegramUser,
    serverId: string,
    action: ServerControlAction,
  ): Promise<void> {
    if (!this.access.canControl(tgUser.userId, serverId)) {
      return void ctx.answerCallbackQuery(
        t(lang, "actions.noPermissionManage"),
      );
    }
    const server = this.serversService.findById(serverId);
    if (!server)
      return void ctx.answerCallbackQuery(t(lang, "status.notFound"));

    const user = this.accountsService.findById(tgUser.userId);
    if (!user) return void ctx.answerCallbackQuery(t(lang, "common.error"));

    try {
      if (action === "start")
        await this.serversService.start(serverId, tgUser.userId);
      else if (action === "stop")
        await this.serversService.stop(serverId, user);
      else await this.serversService.restart(serverId, user);

      this.auditLog.record({
        action: CONTROL_AUDIT_ACTION[action],
        category: AuditCategory.SERVER,
        resourceType: "server",
        resourceId: serverId,
        resourceName: server.name,
        result: AuditResult.SUCCESS,
        userId: tgUser.userId,
        username: user.username,
        source: "telegram",
      });

      await ctx.answerCallbackQuery(
        t(lang, "actions.success", {
          name: server.name,
          action: t(lang, `buttons.${action}`),
        }),
      );
      await this.sendServerStatus(ctx, lang, tgUser.userId, serverId, true);
    } catch (error) {
      console.error(`[TelegramBot] Error on ${action}:`, error);
      this.auditLog.record({
        action: CONTROL_AUDIT_ACTION[action],
        category: AuditCategory.SERVER,
        resourceType: "server",
        resourceId: serverId,
        resourceName: server.name,
        result: AuditResult.FAILED,
        error: error instanceof Error ? error.message : String(error),
        userId: tgUser.userId,
        username: user.username,
        source: "telegram",
      });
      await ctx.answerCallbackQuery(
        t(lang, "actions.failed", { action: t(lang, `buttons.${action}`) }),
      );
    }
  }
}

export type { ServerControlAction };
