import { Global, Module } from "@nestjs/common";
import { DatabaseSeeder } from "./database.seeder";
import { AuditLogsRepository } from "./repositories/audit-logs.repository";
import { AuthChallengesRepository } from "./repositories/auth-challenges.repository";
import { ConfigRepository } from "./repositories/config.repository";
import { ExtensionKvRepository } from "./repositories/extension-kv.repository";
import { ExtensionsRepository } from "./repositories/extensions.repository";
import { FtpCredentialsRepository } from "./repositories/ftp-credentials.repository";
import { MetricsRepository } from "./repositories/metrics.repository";
import { NetworksRepository } from "./repositories/networks.repository";
import { NotificationPrefsRepository } from "./repositories/notification-prefs.repository";
import { NotificationsRepository } from "./repositories/notifications.repository";
import { OtpCodesRepository } from "./repositories/otp-codes.repository";
import { RolesRepository } from "./repositories/roles.repository";
import { ScheduledTaskRunsRepository } from "./repositories/scheduled-task-runs.repository";
import { ScheduledTasksRepository } from "./repositories/scheduled-tasks.repository";
import { ServerFoldersRepository } from "./repositories/server-folders.repository";
import { ServerModpacksRepository } from "./repositories/server-modpacks.repository";
import { ServerModsRepository } from "./repositories/server-mods.repository";
import { ServerPluginsRepository } from "./repositories/server-plugins.repository";
import { ServersRepository } from "./repositories/servers.repository";
import { TelegramUsersRepository } from "./repositories/telegram-users.repository";
import { UserSessionsRepository } from "./repositories/user-sessions.repository";
import { UsersRepository } from "./repositories/users.repository";
import { SqliteProvider } from "./sqlite.provider";

@Global()
@Module({
  providers: [
    SqliteProvider,
    ConfigRepository,
    UsersRepository,
    RolesRepository,
    FtpCredentialsRepository,
    ServersRepository,
    ServerFoldersRepository,
    ServerPluginsRepository,
    ServerModsRepository,
    ServerModpacksRepository,
    NetworksRepository,
    TelegramUsersRepository,
    OtpCodesRepository,
    UserSessionsRepository,
    ScheduledTasksRepository,
    ScheduledTaskRunsRepository,
    AuthChallengesRepository,
    AuditLogsRepository,
    MetricsRepository,
    NotificationsRepository,
    NotificationPrefsRepository,
    ExtensionsRepository,
    ExtensionKvRepository,
    DatabaseSeeder,
  ],
  exports: [
    SqliteProvider,
    ConfigRepository,
    UsersRepository,
    RolesRepository,
    FtpCredentialsRepository,
    ServersRepository,
    ServerFoldersRepository,
    ServerPluginsRepository,
    ServerModsRepository,
    ServerModpacksRepository,
    NetworksRepository,
    TelegramUsersRepository,
    OtpCodesRepository,
    UserSessionsRepository,
    ScheduledTasksRepository,
    ScheduledTaskRunsRepository,
    AuthChallengesRepository,
    AuditLogsRepository,
    MetricsRepository,
    NotificationsRepository,
    NotificationPrefsRepository,
    ExtensionsRepository,
    ExtensionKvRepository,
    DatabaseSeeder,
  ],
})
export class DatabaseModule {}
