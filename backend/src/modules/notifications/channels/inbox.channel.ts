import { NotificationsRepository } from "@/modules/database/repositories/notifications.repository";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable } from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import { WsNotificationEventTypes } from "@shared/types/ws/notification-events.types";
import type {
  NotificationChannelHandler,
  NotificationDelivery,
} from "../notification.types";

@Injectable()
export class InboxChannel implements NotificationChannelHandler {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly broadcast: ServerBroadcastService,
  ) {}

  deliver(
    user: IUser,
    { kind, params, spec }: NotificationDelivery,
  ): Promise<void> {
    if (!spec.inbox) return Promise.resolve();
    const notification = this.repo.create({
      userId: user.id,
      kind,
      params,
    });
    this.broadcast.emitToRoom(
      `user:${user.id}`,
      WsNotificationEventTypes.NEW,
      notification,
    );
    return Promise.resolve();
  }
}
