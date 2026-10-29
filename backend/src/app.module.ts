import { AppEventsModule } from "@/core/events/app-events.module";
import { ServerLocksModule } from "@/core/locks/server-locks.module";
import { StaticMiddleware } from "@/core/middlewares/static";
import { AccountsModule } from "@/modules/accounts/accounts.module";
import { AssistantModule } from "@/modules/assistant/assistant.module";
import { AuditLogModule } from "@/modules/audit-log/audit-log.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { SubnetGuard } from "@/modules/auth/guards/subnet.guard";
import { BackupsModule } from "@/modules/backups/backups.module";
import { DatabaseModule } from "@/modules/database/database.module";
import { ExtensionsModule } from "@/modules/extensions/extensions.module";
import { FilesModule } from "@/modules/files/files.module";
import { FtpModule } from "@/modules/ftp/ftp.module";
import { HeadsModule } from "@/modules/heads/heads.module";
import { HealthModule } from "@/modules/health/health.module";
import { JavaModule } from "@/modules/java/java.module";
import { KubekModule } from "@/modules/kubek/kubek.module";
import { MetricsHistoryModule } from "@/modules/metrics-history/metrics-history.module";
import { LegacyMigrationModule } from "@/modules/migration/legacy-migration.module";
import { ModpacksModule } from "@/modules/modpacks/modpacks.module";
import { NetworksModule } from "@/modules/networks/networks.module";
import { ModsModule } from "@/modules/mods/mods.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { PermissionsModule } from "@/modules/permissions/permissions.module";
import { PlayersModule } from "@/modules/players/players.module";
import { RateLimitModule } from "@/modules/rate-limit/rate-limit.module";
import { RolesModule } from "@/modules/roles/roles.module";
import { PluginsModule } from "@/modules/plugins/plugins.module";
import { ScheduledTasksModule } from "@/modules/scheduled-tasks/scheduled-tasks.module";
import { ServerFoldersModule } from "@/modules/server-folders/server-folders.module";
import { ServerLogsModule } from "@/modules/server-logs/server-logs.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { SessionsModule } from "@/modules/sessions/sessions.module";
import { StatsModule } from "@/modules/stats/stats.module";
import { SystemMonitoringModule } from "@/modules/system-monitoring/system-monitoring.module";
import { TasksModule } from "@/modules/tasks/tasks.module";
import { TelegramBotModule } from "@/modules/telegram-bot/telegram-bot.module";
import { WsModule } from "@/ws/ws.module";
import { MiddlewareConsumer, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    AppEventsModule,
    ServerLocksModule,
    RateLimitModule,
    DatabaseModule,
    LegacyMigrationModule,
    AuditLogModule,
    PermissionsModule,
    AuthModule,
    AccountsModule,
    RolesModule,
    ServerTypesModule,
    KubekModule,
    JavaModule,
    TasksModule,
    WsModule,
    ServersModule,
    FilesModule,
    PluginsModule,
    ModsModule,
    ModpacksModule,
    NetworksModule,
    TelegramBotModule,
    NotificationsModule,
    BackupsModule,
    SystemMonitoringModule,
    FtpModule,
    StatsModule,
    SessionsModule,
    ScheduledTasksModule,
    ServerFoldersModule,
    MetricsHistoryModule,
    ServerLogsModule,
    ExtensionsModule,
    HeadsModule,
    HealthModule,
    PlayersModule,
    AssistantModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SubnetGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply().forRoutes("*").apply(StaticMiddleware).forRoutes("*");
  }
}
