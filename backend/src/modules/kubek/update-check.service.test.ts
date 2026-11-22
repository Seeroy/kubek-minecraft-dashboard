import { afterEach, describe, expect, test } from "bun:test";
import type { AppEventsService } from "@/core/events/app-events.service";
import type { ConfigService } from "@/modules/config/config.service";
import { UpdateCheckService } from "./update-check.service";

function setup() {
  const store: Record<string, unknown> = {};
  const emitted: unknown[] = [];
  const config = { get: (key: string) => store[key], set: (key: string, value: unknown) => (store[key] = value) };
  const events = { emit: (_name: string, payload: unknown) => emitted.push(payload) };
  const service = new UpdateCheckService(config as unknown as ConfigService, events as unknown as AppEventsService);
  return { service, emitted, store };
}

describe("UpdateCheckService.notifyOnce", () => {
  const env = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = env;
  });

  test("emits once per release and remembers it", () => {
    process.env.NODE_ENV = "production";
    const { service, emitted, store } = setup();
    service.notifyOnce({ updateAvailable: true, latestVersion: "4.2.0", releaseUrl: "https://example.test/r/4.2.0" });
    service.notifyOnce({ updateAvailable: true, latestVersion: "4.2.0", releaseUrl: "https://example.test/r/4.2.0" });
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ version: "4.2.0", url: "https://example.test/r/4.2.0" });
    expect(store.updateNotifiedVersion).toBe("4.2.0");

    service.notifyOnce({ updateAvailable: true, latestVersion: "4.3.0" });
    expect(emitted).toHaveLength(2);
  });

  test("stays quiet without an update or in a dev build", () => {
    process.env.NODE_ENV = "production";
    const quiet = setup();
    quiet.service.notifyOnce({ updateAvailable: false, latestVersion: "4.2.0" });
    expect(quiet.emitted).toHaveLength(0);

    process.env.NODE_ENV = "development";
    const dev = setup();
    dev.service.notifyOnce({ updateAvailable: true, latestVersion: "4.2.0" });
    expect(dev.emitted).toHaveLength(0);
  });
});
