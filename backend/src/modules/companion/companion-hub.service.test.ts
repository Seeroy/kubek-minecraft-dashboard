import type { AppEventsService } from "@/core/events/app-events.service";
import type { CompanionEventsRepository } from "@/modules/database/repositories/companion-events.repository";
import type { CompanionMetricsRepository } from "@/modules/database/repositories/companion-metrics.repository";
import type {
  CompanionSettingsRepository,
  CompanionSettingsRow,
} from "@/modules/database/repositories/companion-settings.repository";
import { fake } from "@/testing/fake";
import type { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import type { CompanionEvent } from "@shared/types/companion.types";
import { beforeEach, expect, test } from "bun:test";
import { CompanionHubService } from "./companion-hub.service";

let stored: CompanionEvent[];
let emitted: CompanionEvent[];
let settings: CompanionSettingsRow;
let hub: CompanionHubService;

const event = (type: CompanionEvent["type"]): CompanionEvent => ({
  type,
  ts: 1,
});

beforeEach(() => {
  stored = [];
  emitted = [];
  settings = {
    sessions: true,
    kicks: true,
    deaths: true,
    chat: false,
    coords: false,
    maintenance: null,
  };
  hub = new CompanionHubService(
    fake<CompanionSettingsRepository>({ get: () => settings }),
    fake<CompanionMetricsRepository>(),
    fake<CompanionEventsRepository>({
      insertMany: (_id, events) => stored.push(...events),
    }),
    fake<ServerBroadcastService>(),
    fake<AppEventsService>({
      emit: ((_name: string, payload: { events: CompanionEvent[] }) =>
        emitted.push(...payload.events)) as AppEventsService["emit"],
    }),
  );
});

test("the feed keeps only the types that are turned on", () => {
  settings.deaths = false;
  hub.events(
    "srv",
    ["join", "quit", "kick", "death", "chat"].map((t) =>
      event(t as CompanionEvent["type"]),
    ),
  );
  expect(stored.map((e) => e.type)).toEqual(["join", "quit", "kick"]);
});

test("countdown events skip the feed but still reach listeners", () => {
  hub.events("srv", [event("countdown_done")]);
  expect(stored).toEqual([]);
  expect(emitted.map((e) => e.type)).toEqual(["countdown_done"]);
});
