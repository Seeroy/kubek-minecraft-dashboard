import { AccountsService } from "@/modules/accounts/accounts.service";
import { Injectable } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { can, canOnServer, canSeeServer } from "@shared/access/can";
import type { IServer } from "@shared/types/server/server.types";
import type { IUser } from "@shared/types/user.types";

/** Access checks for Telegram-initiated actions */
@Injectable()
export class BotAccessService {
  constructor(private readonly accounts: AccountsService) {}

  getUser(userId: string): IUser | null {
    return this.accounts.findById(userId) ?? null;
  }

  canCreate(userId: string): boolean {
    return can(this.getUser(userId), AccessArea.SERVERS, "write");
  }

  canView(userId: string, serverId: string): boolean {
    return canOnServer(
      this.getUser(userId),
      AccessArea.POWER,
      "read",
      serverId,
    );
  }

  canControl(userId: string, serverId: string): boolean {
    return canOnServer(
      this.getUser(userId),
      AccessArea.POWER,
      "write",
      serverId,
    );
  }

  visibleServers(userId: string, servers: IServer[]): IServer[] {
    const user = this.getUser(userId);
    return servers.filter((server) => canSeeServer(user, server.id));
  }
}
