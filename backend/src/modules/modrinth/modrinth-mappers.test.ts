import { describe, expect, test } from "bun:test";
import type { ModrinthVersion } from "@shared/types/plugins";
import { resolveDependencies } from "./dependency-resolver";
import {
  pickLatestCompatible,
  requiredDependencies,
  versionToSummary,
} from "./modrinth-mappers";

function version(partial: Partial<ModrinthVersion>): ModrinthVersion {
  return {
    id: "v1",
    project_id: "p1",
    author_id: "a",
    featured: false,
    name: "1.0",
    version_number: "1.0",
    date_published: "2026-01-01T00:00:00Z",
    downloads: 0,
    version_type: "release",
    files: [],
    dependencies: [],
    game_versions: ["1.21.1"],
    loaders: ["fabric"],
    ...partial,
  };
}

const withDeps = version({
  dependencies: [
    {
      project_id: "fabric-api",
      version_id: "fa1",
      dependency_type: "required",
    },
    { project_id: "cloth", version_id: null, dependency_type: "required" },
    { project_id: "modmenu", dependency_type: "optional" },
    { project_id: null, file_name: "x.jar", dependency_type: "embedded" },
  ],
});

describe("versionToSummary", () => {
  test("maps snake_case dependencies and file types", () => {
    const summary = versionToSummary(
      version({
        ...withDeps,
        files: [
          {
            filename: "a.jar",
            primary: true,
            url: "https://cdn.modrinth.com/a.jar",
            hashes: {},
            file_type: null,
          },
        ],
      }),
    );
    expect(summary.dependencies[0]).toEqual({
      projectId: "fabric-api",
      versionId: "fa1",
      dependencyType: "required",
      fileName: undefined,
    });
    expect(summary.files[0].fileType).toBeUndefined();
  });
});

describe("requiredDependencies", () => {
  test("keeps required ones with a project", () => {
    expect(requiredDependencies(withDeps)).toEqual([
      { projectId: "fabric-api", versionId: "fa1" },
      { projectId: "cloth", versionId: undefined },
    ]);
  });
});

describe("resolveDependencies", () => {
  test("resolves missing versions through the lookup", async () => {
    const deps = await resolveDependencies(withDeps, {
      installRequired: true,
      latestVersionOf: (projectId) => Promise.resolve(`${projectId}-latest`),
    });
    expect(deps).toEqual([
      { projectId: "fabric-api", versionId: "fa1" },
      { projectId: "cloth", versionId: "cloth-latest" },
    ]);
  });

  test("explicit picks win and nothing else is added when not required", async () => {
    const explicit = [{ projectId: "fabric-api", versionId: "fa2" }];
    expect(
      await resolveDependencies(withDeps, {
        installRequired: false,
        explicit,
        latestVersionOf: () => Promise.resolve(undefined),
      }),
    ).toEqual(explicit);
    expect(
      await resolveDependencies(withDeps, {
        installRequired: true,
        explicit,
        latestVersionOf: () => Promise.resolve(undefined),
      }),
    ).toEqual(explicit);
  });
});

describe("pickLatestCompatible", () => {
  test("filters by loader and game version, then takes the newest", () => {
    const versions = [
      version({ id: "old", date_published: "2026-01-01T00:00:00Z" }),
      version({ id: "new", date_published: "2026-03-01T00:00:00Z" }),
      version({
        id: "other-game",
        date_published: "2026-05-01T00:00:00Z",
        game_versions: ["1.20.1"],
      }),
      version({
        id: "forge",
        date_published: "2026-06-01T00:00:00Z",
        loaders: ["forge"],
      }),
    ];
    expect(pickLatestCompatible(versions, ["fabric"], "1.21.1")?.id).toBe(
      "new",
    );
    expect(pickLatestCompatible(versions, ["fabric"])?.id).toBe("other-game");
  });
});
