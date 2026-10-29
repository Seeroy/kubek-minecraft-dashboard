import {
  NotificationCategory,
  NotificationChannel,
} from "@shared/types/notification.types";
import { describe, expect, test } from "bun:test";
import {
  applyOverrides,
  defaultPrefs,
  toOverrides,
} from "./notification-prefs";

const { TASKS, SERVERS } = NotificationCategory;
const { INBOX, TELEGRAM } = NotificationChannel;

describe("notification prefs", () => {
  test("inbox is on everywhere, telegram skips tasks by default", () => {
    const prefs = defaultPrefs();
    expect(prefs[TASKS][INBOX]).toBe(true);
    expect(prefs[TASKS][TELEGRAM]).toBe(false);
    expect(prefs[SERVERS][TELEGRAM]).toBe(true);
  });

  test("overrides are applied on top of defaults", () => {
    const prefs = applyOverrides([
      { category: TASKS, channel: TELEGRAM, enabled: true },
    ]);
    expect(prefs[TASKS][TELEGRAM]).toBe(true);
  });

  test("only differences from defaults are stored", () => {
    const prefs = defaultPrefs();
    prefs[SERVERS][TELEGRAM] = false;
    expect(toOverrides(prefs)).toEqual([
      { category: SERVERS, channel: TELEGRAM, enabled: false },
    ]);
  });

  test("round trip keeps the prefs", () => {
    const prefs = defaultPrefs();
    prefs[TASKS][TELEGRAM] = true;
    prefs[SERVERS][INBOX] = false;
    expect(applyOverrides(toOverrides(prefs))).toEqual(prefs);
  });
});
