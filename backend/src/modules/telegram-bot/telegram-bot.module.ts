import { ConfigModule } from "@/modules/config/config.module";
import { DatabaseModule } from "@/modules/database/database.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Module } from "@nestjs/common";
import { BotAccessService } from "./bot-access.service";
import { BotLinkingService } from "./bot-linking.service";
import { BotTwofaService } from "./bot-twofa.service";
import { BotUsersService } from "./bot-users.service";
import { BotViewsService } from "./bot-views.service";
import { CreateServerWizard } from "./create-server-wizard.service";
import { NotificationService } from "./notification.service";
import { TelegramBotController } from "./telegram-bot.controller";
import { TelegramBotService } from "./telegram-bot.service";

@Module({
  imports: [DatabaseModule, ServersModule, ConfigModule, ServerTypesModule],
  providers: [
    TelegramBotService,
    NotificationService,
    BotAccessService,
    BotUsersService,
    BotViewsService,
    BotLinkingService,
    BotTwofaService,
    CreateServerWizard,
  ],
  controllers: [TelegramBotController],
  exports: [TelegramBotService, NotificationService],
})
export class TelegramBotModule {}
