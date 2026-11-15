import { describe, expect, it } from "bun:test";
import { ServerStatus } from "@shared/types/server/server.types";
import type { InlineKeyboard } from "grammy";
import {
  backupRetryKeyboard,
  controlStates,
  crashKeyboard,
  loginAlertKeyboard,
  statusKeyboard,
} from "./bot-keyboards";
import { tgTime } from "./bot-format";

type Button = Record<string, unknown>;
const buttons = (kb: InlineKeyboard) =>
  kb.inline_keyboard.flat() as unknown as Button[];

describe("controlStates", () => {
  it("offers only what fits the status", () => {
    expect(controlStates(ServerStatus.RUNNING, true)).toEqual({
      start: false,
      stop: true,
      restart: true,
    });
    expect(controlStates(ServerStatus.STOPPED, true)).toEqual({
      start: true,
      stop: false,
      restart: false,
    });
    expect(controlStates(ServerStatus.CRASHED, true).start).toBe(true);
    expect(controlStates(ServerStatus.STARTING, true)).toEqual({
      start: false,
      stop: true,
      restart: false,
    });
    expect(controlStates(ServerStatus.STOPPING, true)).toEqual({
      start: false,
      stop: false,
      restart: false,
    });
  });

  it("disables everything without the permission", () => {
    expect(controlStates(ServerStatus.STOPPED, false)).toEqual({
      start: false,
      stop: false,
      restart: false,
    });
  });
});

describe("statusKeyboard", () => {
  it("keeps all three power buttons and grays out the unusable ones", () => {
    const row = buttons(
      statusKeyboard("en", { id: "s1", status: ServerStatus.RUNNING }, true),
    ).slice(0, 3);
    expect(row.map((b) => "disabled" in b)).toEqual([true, false, false]);
    expect(row[1]).toMatchObject({ callback_data: "srv:stop:s1", style: "danger" });
  });

  it("shows the row grayed out for viewers without control", () => {
    const row = buttons(
      statusKeyboard("en", { id: "s1", status: ServerStatus.STOPPED }, false),
    ).slice(0, 3);
    expect(row.every((b) => "disabled" in b)).toBe(true);
  });
});

describe("alert keyboards", () => {
  it("routes alert buttons to their handlers", () => {
    expect(buttons(crashKeyboard("en", "s1"))[0]).toMatchObject({
      callback_data: "srv:restart:s1",
      style: "success",
    });
    expect(buttons(loginAlertKeyboard("en", "u1"))[0]).toMatchObject({
      callback_data: "sec:notme:u1",
      style: "danger",
    });
    expect(buttons(backupRetryKeyboard("en", "b1"))[0]).toMatchObject({
      callback_data: "bk:retry:b1",
    });
  });

  it("fits callback data into the 64 byte limit with uuids", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const data = [
      ...buttons(loginAlertKeyboard("en", id)),
      ...buttons(backupRetryKeyboard("en", id)),
    ].map((b) => String(b.callback_data));
    expect(data.every((value) => Buffer.byteLength(value) <= 64)).toBe(true);
  });
});

describe("tgTime", () => {
  it("renders a date_time tag with a UTC fallback", () => {
    expect(tgTime(Date.UTC(2026, 10, 15, 12, 30), "r")).toBe(
      '<tg-time unix="1794745800" format="r">2026-11-15 12:30 UTC</tg-time>',
    );
  });
});
