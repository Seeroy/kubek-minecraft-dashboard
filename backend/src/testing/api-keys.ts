import { AppEventsService } from "@/core/events/app-events.service";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { ApiKeysService } from "@/modules/api-keys/api-keys.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { ApiKeysRepository } from "@/modules/database/repositories/api-keys.repository";
import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { UsersRepository } from "@/modules/database/repositories/users.repository";
import type { SqliteProvider } from "@/modules/database/sqlite.provider";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";

export function apiKeysService(
  sqlite: SqliteProvider,
  users: UsersRepository,
  events = new AppEventsService(),
): ApiKeysService {
  const servers = new ServersRepository(sqlite);
  const audit = new AuditLogService(new AuditLogsRepository(sqlite), servers);
  return new ApiKeysService(
    new ApiKeysRepository(sqlite),
    new AccountsService(users),
    servers,
    new RateLimitService(events, audit),
    events,
  );
}
