import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { Injectable } from "@nestjs/common";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { IUser, UserPermissions } from "@shared/types/user.types";

@Injectable()
export class CommandHandlerService {
  constructor(private readonly instancesRegistry: InstancesRegistry) {}

  submit(user: IUser | undefined, serverId: string, command: string): void {
    if (!user) return;
    if (!this.canManageServer(user, serverId)) return;

    const instance = this.instancesRegistry.getByServerId(serverId);
    // Docker servers have no host pid, gate on runtime liveness instead
    if (!instance || !instance.isRunning()) return;

    instance.input(command, user);
  }

  fetchFullLog(user: IUser | undefined, serverId: string): IInstanceLog[] {
    if (!user) return [];
    if (!this.canMonitorServer(user, serverId)) return [];

    const instance = this.instancesRegistry.getByServerId(serverId);
    return instance ? instance.getLog() : [];
  }

  private hasServerAccess(user: IUser, serverId: string): boolean {
    if (!user.serversRestrict?.enabled) return true;
    return (user.serversRestrict.allowed ?? []).includes(serverId);
  }

  private canManageServer(user: IUser, serverId: string): boolean {
    const allowed =
      user.isAdmin ||
      user.permissions?.includes(UserPermissions.SERVERS_CONTROL);
    return Boolean(allowed) && this.hasServerAccess(user, serverId);
  }

  private canMonitorServer(user: IUser, serverId: string): boolean {
    const allowed =
      user.isAdmin || user.permissions?.includes(UserPermissions.SERVERS_VIEW);
    return Boolean(allowed) && this.hasServerAccess(user, serverId);
  }
}
