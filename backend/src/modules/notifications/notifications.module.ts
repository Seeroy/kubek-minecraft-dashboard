import { AccountsModule } from "@/modules/accounts/accounts.module";
import { TelegramBotModule } from "@/modules/telegram-bot/telegram-bot.module";
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { InboxChannel } from "./channels/inbox.channel";
import { TelegramChannel } from "./channels/telegram.channel";
import { NotificationAudienceService } from "./notification-audience.service";
import { NotificationRulesService } from "./notification-rules.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [AccountsModule, TelegramBotModule, ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationAudienceService,
    NotificationRulesService,
    InboxChannel,
    TelegramChannel,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
