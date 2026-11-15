import { AssistantModule } from "@/modules/assistant/assistant.module";
import { ConfigModule } from "@/modules/config/config.module";
import { BackupsModule } from "@/modules/backups/backups.module";
import { DatabaseModule } from "@/modules/database/database.module";
import { MetricsHistoryModule } from "@/modules/metrics-history/metrics-history.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { SystemMonitoringModule } from "@/modules/system-monitoring/system-monitoring.module";
import { Module } from "@nestjs/common";
import { BotAccessService } from "./bot-access.service";
import { BotAddressService } from "./bot-address.service";
import { BotAlertsService } from "./bot-alerts.service";
import { BotAssistantService } from "./bot-assistant.service";
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
    MetricsHistoryModule,
    BackupsModule,
    AssistantModule,
  ],
  providers: [
    TelegramBotService,
    TelegramNotifier,
    BotAccessService,
    BotAddressService,
    BotAlertsService,
    BotUsersService,
    BotViewsService,
    BotLinkingService,
    BotTwofaService,
    CreateServerWizard,
    BotAssistantService,
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
