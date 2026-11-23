import { describe, expect, test } from "bun:test";
import { Logger } from "@nestjs/common";
import type { ModrinthVersion, ServerPluginRecord } from "@shared/types/plugins";
import type { ModrinthClient } from "./modrinth-client.service";
import { InstalledContentReader } from "./installed-content-reader";

const version = (id: string, projectId: string, date: string) =>
  ({
    id,
    project_id: projectId,
    version_number: id,
    date_published: date,
    loaders: ["paper"],
    game_versions: ["1.21.4"],
  }) as unknown as ModrinthVersion;

const record = (id: string, projectId: string, versionId: string) =>
  ({ id, serverId: "s1", projectId, versionId, fileName: `${id}.jar` }) as ServerPluginRecord;

function setup(byProject: Record<string, ModrinthVersion[]>) {
  const calls: string[] = [];
  const all = Object.values(byProject).flat();
  const client = {
    getProjectVersions: async (id: string) => {
      calls.push(`versions:${id}`);
      return byProject[id] ?? [];
    },
    getVersions: async (ids: string[]) => {
      calls.push("bulk:versions");
      return all.filter((v) => ids.includes(v.id));
    },
    getProjects: async (ids: string[]) => {
      calls.push("bulk:projects");
      return ids.map((id) => ({ id, title: `Title ${id}` }));
    },
  };
  const reader = new InstalledContentReader(
    client as unknown as ModrinthClient,
    "plugins",
    ["paper"],
    new Logger("test"),
  );
  return { reader, calls };
}

describe("InstalledContentReader.findUpdates", () => {
  test("reports only newer builds, with titles", async () => {
    const { reader } = setup({
      a: [version("a1", "a", "2026-01-01"), version("a2", "a", "2026-02-01")],
      b: [version("b1", "b", "2026-01-01")],
    });
    const updates = await reader.findUpdates(
      [record("r1", "a", "a1"), record("r2", "b", "b1")],
      "1.21.4",
      0,
    );
    expect(updates).toEqual([
      {
        recordId: "r1",
        projectId: "a",
        installedVersionId: "a1",
        latestVersionId: "a2",
        title: "Title a",
      },
    ]);
  });

  test("asks each project once and reuses the cache on the next pass", async () => {
    const { reader, calls } = setup({
      a: [version("a1", "a", "2026-01-01")],
    });
    const records = [record("r1", "a", "a1"), record("r2", "a", "a1")];
    await reader.findUpdates(records, "1.21.4", 0);
    await reader.findUpdates(records, "1.21.4", 0);
    expect(calls).toEqual(["versions:a"]);
  });

  test("pauses before every request", async () => {
    const { reader } = setup({
      a: [version("a1", "a", "2026-01-01"), version("a2", "a", "2026-02-01")],
    });
    const started = Date.now();
    await reader.findUpdates([record("r1", "a", "a1")], "1.21.4", 20);
    // latest + bulk versions + bulk projects
    expect(Date.now() - started).toBeGreaterThanOrEqual(55);
  });
});
