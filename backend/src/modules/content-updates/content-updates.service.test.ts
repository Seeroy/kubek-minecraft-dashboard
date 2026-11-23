import { describe, expect, test } from "bun:test";
import type { AppEventsService } from "@/core/events/app-events.service";
import type { ConfigService } from "@/modules/config/config.service";
import type { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ContentUpdate } from "@/modules/modrinth/installed-content-reader";
import type { ModsService } from "@/modules/mods/mods.service";
import type { PluginsService } from "@/modules/plugins/plugins.service";
import { ContentUpdatesService } from "./content-updates.service";

const update = (projectId: string, latestVersionId: string): ContentUpdate => ({
  recordId: `r-${projectId}`,
  projectId,
  installedVersionId: "old",
  latestVersionId,
  title: `Title ${projectId}`,
});

function setup() {
  const store: Record<string, unknown> = {};
  const emitted: unknown[] = [];
  let pluginUpdates: ContentUpdate[] = [];
  let fail = false;
  const plugins = {
    checkUpdates: async () => {
      if (fail) throw new Error("modrinth down");
      return pluginUpdates;
    },
  };
  const mods = { checkUpdates: async () => [] };
  const service = new ContentUpdatesService(
    { findAll: () => [{ id: "s1", name: "Survival" }] } as unknown as ServersRepository,
    plugins as unknown as PluginsService,
    mods as unknown as ModsService,
    {
      get: (key: string) => store[key],
      set: (key: string, value: unknown) => (store[key] = value),
    } as unknown as ConfigService,
    { emit: (_: string, payload: unknown) => emitted.push(payload) } as unknown as AppEventsService,
  );
  return {
    service,
    emitted,
    setUpdates: (u: ContentUpdate[]) => (pluginUpdates = u),
    setFail: (f: boolean) => (fail = f),
  };
}

describe("ContentUpdatesService.checkAll", () => {
  test("notifies once per new build", async () => {
    const { service, emitted, setUpdates } = setup();
    setUpdates([update("a", "a2")]);
    await service.checkAll();
    await service.checkAll();
    expect(emitted).toEqual([
      { serverId: "s1", serverName: "Survival", kind: "plugins", count: 1, names: ["Title a"] },
    ]);

    setUpdates([update("a", "a2"), update("b", "b2")]);
    await service.checkAll();
    expect(emitted).toHaveLength(2);
    expect(emitted[1]).toMatchObject({ count: 2 });
  });

  test("a failed check keeps the notified builds", async () => {
    const { service, emitted, setUpdates, setFail } = setup();
    setUpdates([update("a", "a2")]);
    await service.checkAll();
    setFail(true);
    await service.checkAll();
    setFail(false);
    await service.checkAll();
    expect(emitted).toHaveLength(1);
  });
});
