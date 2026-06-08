import { Global, Module } from "@nestjs/common";
import { DatabaseSeeder } from "./database.seeder";
import { AuditLogsRepository } from "./repositories/audit-logs.repository";
import { AuthChallengesRepository } from "./repositories/auth-challenges.repository";
import { ConfigRepository } from "./repositories/config.repository";
import { ExtensionKvRepository } from "./repositories/extension-kv.repository";
import { ExtensionsRepository } from "./repositories/extensions.repository";
import {
  Metrics1mRepository,
  Metrics5mRepository,
  MetricsRawRepository,
} from "./repositories/metrics.repository";
import { OtpCodesRepository } from "./repositories/otp-codes.repository";
import { ScheduledTaskRunsRepository } from "./repositories/scheduled-task-runs.repository";
import { ScheduledTasksRepository } from "./repositories/scheduled-tasks.repository";
import { ServerFoldersRepository } from "./repositories/server-folders.repository";
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
    ServersRepository,
    ServerFoldersRepository,
    ServerPluginsRepository,
    ServerModsRepository,
    TelegramUsersRepository,
    OtpCodesRepository,
    UserSessionsRepository,
    ScheduledTasksRepository,
    ScheduledTaskRunsRepository,
    AuthChallengesRepository,
    AuditLogsRepository,
    MetricsRawRepository,
    Metrics1mRepository,
    Metrics5mRepository,
    ExtensionsRepository,
    ExtensionKvRepository,
    DatabaseSeeder,
  ],
  exports: [
    SqliteProvider,
    ConfigRepository,
    UsersRepository,
    ServersRepository,
    ServerFoldersRepository,
    ServerPluginsRepository,
    ServerModsRepository,
    TelegramUsersRepository,
    OtpCodesRepository,
    UserSessionsRepository,
    ScheduledTasksRepository,
    ScheduledTaskRunsRepository,
    AuthChallengesRepository,
    AuditLogsRepository,
    MetricsRawRepository,
    Metrics1mRepository,
    Metrics5mRepository,
    ExtensionsRepository,
    ExtensionKvRepository,
  ],
})
export class DatabaseModule {}
