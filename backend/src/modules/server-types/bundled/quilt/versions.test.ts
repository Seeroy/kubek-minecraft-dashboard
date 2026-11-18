import type { VersionResolverContext } from "@kubekpanel/blueprint-sdk";
import { describe, expect, test } from "bun:test";
import resolver from "./versions";

const META: Record<string, unknown> = {
  "/game": [
    { version: "26.3", stable: true },
    { version: "26.4-snapshot-2", stable: false },
    { version: "1.21.1", stable: true },
  ],
  "/loader": [{ version: "0.31.0-beta.6" }, { version: "0.30.2" }],
  "/installer": [
    {
      version: "0.15.1",
      url: "https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-installer/0.15.1/quilt-installer-0.15.1.jar",
    },
  ],
};

function context(
  variables: VersionResolverContext["variables"] = {},
): VersionResolverContext {
  return {
    variables,
    platform: { os: "linux", arch: "x64" },
    fetch: (url) => {
      const path = String(url).replace(
        "https://meta.quiltmc.org/v3/versions",
        "",
      );
      return Promise.resolve(Response.json(META[path] ?? []));
    },
  };
}

describe("quilt resolver", () => {
  test("lists stable game versions", async () => {
    const list = await resolver.listVersions(context());
    expect(list.map((v) => v.id)).toEqual(["26.3", "1.21.1"]);
  });

  test("picks the newest stable loader and the installer", async () => {
    const spec = await resolver.resolveDownload("1.21.1", context());
    expect(spec).toEqual({
      url: "https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-installer/0.15.1/quilt-installer-0.15.1.jar",
      vars: { QUILT_LOADER: "0.30.2", QUILT_LOADER_VERSION: "0.30.2" },
    });
  });

  test("a pinned loader wins", async () => {
    const spec = await resolver.resolveDownload(
      "1.21.1",
      context({ QUILT_LOADER_VERSION: "0.29.0" }),
    );
    expect(spec.vars).toEqual({
      QUILT_LOADER: "0.29.0",
      QUILT_LOADER_VERSION: "0.29.0",
    });
  });
});
