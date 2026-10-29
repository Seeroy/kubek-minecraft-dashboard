import { AccountsService } from "@/modules/accounts/accounts.service";
import { Injectable } from "@nestjs/common";
import { can, canOnServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import type { NotificationAudience } from "./notification.types";

@Injectable()
export class NotificationAudienceService {
  constructor(private readonly accounts: AccountsService) {}

  resolve(audience: NotificationAudience): IUser[] {
    if ("userId" in audience) {
      const user = this.accounts.findById(audience.userId);
      return user ? [user] : [];
    }
    return this.accounts
      .findAll()
      .filter((user) =>
        "serverId" in audience
          ? canOnServer(user, audience.area, audience.level, audience.serverId)
          : can(user, audience.area, audience.level),
      );
  }
}
