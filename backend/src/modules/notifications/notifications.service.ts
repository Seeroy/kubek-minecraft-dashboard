import { getErrorMessage } from "@/core/utils/error";
import { NotificationPrefsRepository } from "@/modules/database/repositories/notification-prefs.repository";
import { NotificationsRepository } from "@/modules/database/repositories/notifications.repository";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  NOTIFICATION_KINDS,
  NotificationChannel,
  type NotificationKind,
  type NotificationPrefs,
  type NotificationsPage,
} from "@shared/types/notification.types";
import type { IUser } from "@shared/types/user.types";
import { InboxChannel } from "./channels/inbox.channel";
import { TelegramChannel } from "./channels/telegram.channel";
import { NotificationAudienceService } from "./notification-audience.service";
import { applyOverrides, toOverrides } from "./notification-prefs";
import type {
  NotificationChannelHandler,
  NotificationDraft,
} from "./notification.types";
import { decodeCursor, encodeCursor } from "./notifications-cursor";

const DAY = 24 * 60 * 60 * 1000;
const READ_RETENTION = 30 * DAY;
const MAX_RETENTION = 90 * DAY;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly channels: Record<
    NotificationChannel,
    NotificationChannelHandler
  >;

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly prefsRepo: NotificationPrefsRepository,
    private readonly audience: NotificationAudienceService,
    inbox: InboxChannel,
    telegram: TelegramChannel,
  ) {
    this.channels = {
      [NotificationChannel.INBOX]: inbox,
      [NotificationChannel.TELEGRAM]: telegram,
    };
  }

  /** Sends to every recipient over the channels they keep on for the category */
  notify<K extends NotificationKind>(draft: NotificationDraft<K>): void {
    const spec = NOTIFICATION_KINDS[draft.kind];
    const delivery = { kind: draft.kind, params: draft.params, spec };
    for (const user of this.audience.resolve(draft.audience)) {
      const prefs = this.getPrefs(user.id)[spec.category];
      for (const channel of Object.values(NotificationChannel)) {
        if (!prefs[channel]) continue;
        void this.channels[channel]
          .deliver(user, delivery)
          .catch((err) => this.logFailure(channel, user, err));
      }
    }
  }

  list(
    userId: string,
    opts: { limit: number; unreadOnly: boolean; cursor?: string },
  ): NotificationsPage {
    const items = this.repo.page(userId, {
      limit: opts.limit + 1,
      unreadOnly: opts.unreadOnly,
      after: opts.cursor ? decodeCursor(opts.cursor) : undefined,
    });
    const hasMore = items.length > opts.limit;
    const page = hasMore ? items.slice(0, opts.limit) : items;
    return {
      items: page,
      nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
      unreadCount: this.repo.unreadCount(userId),
    };
  }

  markRead(userId: string, id: string): void {
    this.repo.markRead(userId, id);
  }

  markAllRead(userId: string): void {
    this.repo.markAllRead(userId);
  }

  remove(userId: string, id: string): void {
    if (!this.repo.delete(userId, id)) {
      throw new NotFoundException("Notification not found");
    }
  }

  getPrefs(userId: string): NotificationPrefs {
    return applyOverrides(this.prefsRepo.findByUser(userId));
  }

  setPrefs(
    userId: string,
    prefs: Partial<NotificationPrefs>,
  ): NotificationPrefs {
    this.prefsRepo.replace(
      userId,
      toOverrides({ ...this.getPrefs(userId), ...prefs }),
    );
    return this.getPrefs(userId);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  prune(): void {
    const now = Date.now();
    const removed = this.repo.prune(now - READ_RETENTION, now - MAX_RETENTION);
    if (removed > 0) this.logger.log(`Pruned ${removed} old notifications`);
  }

  private logFailure(channel: NotificationChannel, user: IUser, err: unknown) {
    this.logger.warn(
      `Failed to deliver ${channel} notification to ${user.username}: ${getErrorMessage(err)}`,
    );
  }
}
