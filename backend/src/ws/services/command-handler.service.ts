import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { Injectable } from "@nestjs/common";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { AccessArea } from "@shared/access/areas";
import { canOnServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";

export interface CommandOrigin {
  ip: string | null;
  userAgent: string | null;
}

@Injectable()
export class CommandHandlerService {
  constructor(
    private readonly instancesRegistry: InstancesRegistry,
    private readonly audit: AuditLogService,
    private readonly servers: ServersRepository,
  ) {}

  submit(
    user: IUser | undefined,
    serverId: string,
    command: string,
    origin: CommandOrigin,
  ): void {
    if (!user) return;
    if (!this.canManageServer(user, serverId)) return;

    const instance = this.instancesRegistry.getByServerId(serverId);
    // Docker servers have no host pid, gate on runtime liveness instead
    if (!instance || !instance.isRunning()) return;

    instance.input(command, user);
    this.audit.record({
      action: AuditAction.SERVER_COMMAND,
      category: AuditCategory.SERVER,
      resourceType: "server",
      resourceId: serverId,
      resourceName: this.servers.findById(serverId)?.name,
      userId: user.id,
      username: user.username,
      details: { command },
      ...origin,
    });
  }

  fetchFullLog(user: IUser | undefined, serverId: string): IInstanceLog[] {
    if (!user) return [];
    if (!this.canMonitorServer(user, serverId)) return [];

    const instance = this.instancesRegistry.getByServerId(serverId);
    return instance ? instance.getLog() : [];
  }

  private canManageServer(user: IUser, serverId: string): boolean {
    return canOnServer(user, AccessArea.CONSOLE, "write", serverId);
  }

  private canMonitorServer(user: IUser, serverId: string): boolean {
    return canOnServer(user, AccessArea.CONSOLE, "read", serverId);
  }
}
