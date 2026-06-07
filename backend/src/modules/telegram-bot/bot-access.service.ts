import { AccountsService } from "@/modules/accounts/accounts.service";
import { Injectable } from "@nestjs/common";
import type { IServer } from "@shared/types/server/server.types";
import { type IUser, UserPermissions } from "@shared/types/user.types";

/**
 * Permission checks for Telegram-initiated actions
 */
@Injectable()
export class BotAccessService {
  constructor(private readonly accounts: AccountsService) {}

  getUser(userId: string): IUser | null {
    return this.accounts.findById(userId) ?? null;
  }

  private has(user: IUser | null, permission: UserPermissions): boolean {
    if (!user) return false;
    if (user.isAdmin) return true;
    return !!user.permissions?.includes(permission);
  }

  private allowedServer(user: IUser, serverId: string): boolean {
    if (user.isAdmin) return true;
    if (!user.serversRestrict?.enabled) return true;
    return (user.serversRestrict.allowed || []).includes(serverId);
  }

  canCreate(userId: string): boolean {
    return this.has(this.getUser(userId), UserPermissions.CREATE_SERVERS);
  }

  canView(userId: string, serverId: string): boolean {
    const user = this.getUser(userId);
    return (
      this.has(user, UserPermissions.SERVERS_VIEW) &&
      this.allowedServer(user!, serverId)
    );
  }

  canControl(userId: string, serverId: string): boolean {
    const user = this.getUser(userId);
    return (
      this.has(user, UserPermissions.SERVERS_CONTROL) &&
      this.allowedServer(user!, serverId)
    );
  }

  /** Servers the user is allowed to view (respects SERVERS_VIEW + restrictions) */
  visibleServers(userId: string, servers: IServer[]): IServer[] {
    const user = this.getUser(userId);
    if (!user) return [];
    if (!this.has(user, UserPermissions.SERVERS_VIEW)) return [];
    return servers.filter((s) => this.allowedServer(user, s.id));
  }
}
