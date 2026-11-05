import { AppEventsService } from "@/core/events/app-events.service";
import type { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { fake } from "@/testing/fake";
import { beforeEach, expect, test } from "bun:test";
import { CompanionAlertsService } from "./companion-alerts.service";

let raised: number[];
let alerts: CompanionAlertsService;

beforeEach(() => {
  raised = [];
  const events = fake<AppEventsService>({
    emit: ((name: string, payload: { tps: number }) => {
      if (name === "server.low_tps") raised.push(payload.tps);
    }) as AppEventsService["emit"],
  });
  alerts = new CompanionAlertsService(
    events,
    fake<ServersRepository>({
      findById: () => ({ name: "Survival" }) as never,
    }),
  );
});

test("one alert after a low stretch, not before", () => {
  for (const tps of [12, 11, 10]) alerts.check("srv", tps);
  expect(raised).toEqual([]);
  alerts.check("srv", 9);
  expect(raised).toEqual([9]);
  for (const tps of [8, 7, 6]) alerts.check("srv", tps);
  expect(raised).toEqual([9]);
});

test("a short dip doesn't count and recovery arms it again", () => {
  for (const tps of [10, 10, 16, 10]) alerts.check("srv", tps);
  expect(raised).toEqual([]);
  for (const tps of [10, 10, 10, 10]) alerts.check("srv", tps);
  expect(raised).toHaveLength(1);
  alerts.check("srv", 19.9);
  for (const tps of [5, 5, 5, 5]) alerts.check("srv", tps);
  expect(raised).toHaveLength(2);
});
