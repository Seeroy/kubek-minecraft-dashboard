import { TelegramNotifier } from "@/modules/telegram-bot/telegram-notifier";
import { Injectable } from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import type {
  NotificationChannelHandler,
  NotificationDelivery,
} from "../notification.types";

@Injectable()
export class TelegramChannel implements NotificationChannelHandler {
  constructor(private readonly notifier: TelegramNotifier) {}

  deliver(user: IUser, { kind, params }: NotificationDelivery): Promise<void> {
    return this.notifier.send(user.id, kind, params);
  }
}
