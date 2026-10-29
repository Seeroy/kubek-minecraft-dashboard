import {
  NotificationCategory,
  NotificationChannel,
  type NotificationPrefs,
} from "@shared/types/notification.types";
import type { NotificationPrefOverride } from "@/modules/database/repositories/notification-prefs.repository";

const CHANNEL_DEFAULTS: Record<NotificationChannel, NotificationCategory[]> = {
  [NotificationChannel.INBOX]: Object.values(NotificationCategory),
  // Task results are chatty, the bot only gets them on request
  [NotificationChannel.TELEGRAM]: [
    NotificationCategory.SERVERS,
    NotificationCategory.BACKUPS,
    NotificationCategory.SECURITY,
  ],
};

export function defaultPrefs(): NotificationPrefs {
  const prefs = {} as NotificationPrefs;
  for (const category of Object.values(NotificationCategory)) {
    prefs[category] = {} as NotificationPrefs[NotificationCategory];
    for (const channel of Object.values(NotificationChannel)) {
      prefs[category][channel] = CHANNEL_DEFAULTS[channel].includes(category);
    }
  }
  return prefs;
}

export function applyOverrides(
  overrides: NotificationPrefOverride[],
): NotificationPrefs {
  const prefs = defaultPrefs();
  for (const { category, channel, enabled } of overrides) {
    if (prefs[category]?.[channel] !== undefined) {
      prefs[category][channel] = enabled;
    }
  }
  return prefs;
}

/** Overrides needed to reproduce prefs, unknown keys are dropped */
export function toOverrides(
  prefs: Partial<NotificationPrefs>,
): NotificationPrefOverride[] {
  const defaults = defaultPrefs();
  const overrides: NotificationPrefOverride[] = [];
  for (const category of Object.values(NotificationCategory)) {
    for (const channel of Object.values(NotificationChannel)) {
      const enabled = prefs[category]?.[channel];
      if (
        typeof enabled === "boolean" &&
        enabled !== defaults[category][channel]
      ) {
        overrides.push({ category, channel, enabled });
      }
    }
  }
  return overrides;
}
