import { ConfigModule } from "@/modules/config/config.module";
import { DatabaseModule } from "@/modules/database/database.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { SystemMonitoringModule } from "@/modules/system-monitoring/system-monitoring.module";
import { Module } from "@nestjs/common";
import { BotAccessService } from "./bot-access.service";
import { BotAddressService } from "./bot-address.service";
import { BotLinkingService } from "./bot-linking.service";
import { BotTwofaService } from "./bot-twofa.service";
import { BotUsersService } from "./bot-users.service";
import { BotViewsService } from "./bot-views.service";
import { CreateServerWizard } from "./create-server-wizard.service";
import { TelegramBotController } from "./telegram-bot.controller";
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramNotifier } from "./telegram-notifier";

@Module({
  imports: [
    DatabaseModule,
    ServersModule,
    ConfigModule,
    ServerTypesModule,
    SystemMonitoringModule,
  ],
  providers: [
    TelegramBotService,
    TelegramNotifier,
    BotAccessService,
    BotAddressService,
    BotUsersService,
    BotViewsService,
    BotLinkingService,
    BotTwofaService,
    CreateServerWizard,
  ],
  controllers: [TelegramBotController],
  exports: [
    TelegramBotService,
    TelegramNotifier,
    BotLinkingService,
    BotTwofaService,
  ],
})
export class TelegramBotModule {}
