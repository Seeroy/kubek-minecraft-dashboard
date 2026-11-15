import { getErrorMessage } from "@/core/utils/error";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { BackupCreatorService } from "@/modules/backups/backup-creator.service";
import { BackupsService } from "@/modules/backups/backups.service";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { Injectable, Logger } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { canOnServer } from "@shared/access/can";
import {
  AuditAction,
  AuditCategory,
  AuditResult,
} from "@shared/types/audit.types";
import type {
  ITelegramUser,
  TelegramLang,
} from "@/modules/telegram-bot/telegram.types";
import { BotAccessService } from "./bot-access.service";
import { loginConfirmKeyboard } from "./bot-keyboards";
import type { MyContext } from "./bot-types";
import { t } from "./i18n";

/** Buttons under notifications: the "it wasn't me" login alert and backup retry */
@Injectable()
export class BotAlertsService {
  private readonly logger = new Logger(BotAlertsService.name);

  constructor(
    private readonly access: BotAccessService,
    private readonly sessions: SessionsService,
    private readonly backups: BackupsService,
    private readonly creator: BackupCreatorService,
    private readonly audit: AuditLogService,
  ) {}

  /** step is notme, revoke or keep, the confirm keyboard sits between the first two */
  async handleLogin(
    ctx: MyContext,
    lang: TelegramLang,
    tgUser: ITelegramUser,
    step: string,
    userId: string,
  ): Promise<void> {
    // The alert goes to the account owner only, a forwarded one must not work for others
    if (userId !== tgUser.userId) {
      return void ctx.answerCallbackQuery(t(lang, "security.notOwner"));
    }
    if (step === "notme") {
      await ctx.answerCallbackQuery();
      await ctx.reply(t(lang, "security.confirm"), {
        reply_markup: loginConfirmKeyboard(lang, userId),
      });
      return;
    }
    if (step === "keep") {
      await ctx.answerCallbackQuery(t(lang, "security.kept"));
      await ctx.deleteMessage().catch(() => undefined);
      return;
    }
    if (step !== "revoke") return void ctx.answerCallbackQuery();

    this.sessions.revokeAllForUser(userId);
    const user = this.access.getUser(userId);
    this.audit.record({
      action: AuditAction.AUTH_SESSIONS_REVOKE_ALL,
      category: AuditCategory.AUTH,
      resourceType: "session",
      result: AuditResult.SUCCESS,
      userId,
      username: user?.username,
      source: "telegram",
    });
    await ctx.answerCallbackQuery();
    await ctx
      .editMessageText(t(lang, "security.revoked"))
      .catch(() => ctx.reply(t(lang, "security.revoked")));
  }

  /** Runs a failed backup creation again with the settings of the failed one */
  async retryBackup(
    ctx: MyContext,
    lang: TelegramLang,
    tgUser: ITelegramUser,
    backupId: string,
  ): Promise<void> {
    const failed = this.backups.findById(backupId);
    if (!failed) return void ctx.answerCallbackQuery(t(lang, "backupRetry.notFound"));
    const user = this.access.getUser(tgUser.userId);
    // Same check as POST /backups: backups write on that server
    if (!canOnServer(user, AccessArea.BACKUPS, "write", failed.serverId)) {
      return void ctx.answerCallbackQuery(t(lang, "backupRetry.noPermission"));
    }
    try {
      const { backup } = this.creator.create(
        {
          name: failed.name,
          description: failed.description,
          type: failed.type,
          selectedFiles: failed.selectedFiles,
          serverId: failed.serverId,
          compressionRatio: failed.compressionRatio,
          format: failed.format,
          globExceptions: failed.globExceptions,
        },
        tgUser.userId,
      );
      this.audit.record({
        action: AuditAction.BACKUP_CREATE,
        category: AuditCategory.SERVER,
        resourceType: "backup",
        resourceId: backup.id,
        resourceName: backup.name,
        serverId: backup.serverId,
        result: AuditResult.SUCCESS,
        userId: tgUser.userId,
        username: user?.username,
        source: "telegram",
      });
      await ctx.answerCallbackQuery(
        t(lang, "backupRetry.started", { name: backup.name }),
      );
      // One retry per alert, a second press would start yet another backup
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    } catch (error) {
      this.logger.warn(`Backup retry failed: ${getErrorMessage(error)}`);
      await ctx.answerCallbackQuery(
        t(lang, "backupRetry.failed", { error: getErrorMessage(error) }),
      );
    }
  }
}
