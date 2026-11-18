import type { VersionResolverContext } from "@kubekpanel/blueprint-sdk";
import { describe, expect, test } from "bun:test";
import resolver from "./versions";

const PROMOS = {
  promos: {
    "1.16.5-recommended": "36.2.34",
    "1.17.1-latest": "37.1.1",
    "1.21.1-latest": "52.1.1",
    "1.21.1-recommended": "52.1.0",
    "26.3-latest": "66.1.8",
  },
};

function context(
  variables: VersionResolverContext["variables"] = {},
): VersionResolverContext {
  return {
    variables,
    platform: { os: "linux", arch: "x64" },
    fetch: () => Promise.resolve(Response.json(PROMOS)),
  };
}

describe("forge resolver", () => {
  test("lists game versions from 1.17 up, newest first", async () => {
    const list = await resolver.listVersions(context());
    expect(list.map((v) => v.id)).toEqual(["26.3", "1.21.1", "1.17.1"]);
  });

  test("takes the recommended build, else the latest", async () => {
    const recommended = await resolver.resolveDownload("1.21.1", context());
    expect(recommended).toEqual({
      url: "https://maven.minecraftforge.net/net/minecraftforge/forge/1.21.1-52.1.0/forge-1.21.1-52.1.0-installer.jar",
      vars: { FORGE_BUILD: "1.21.1-52.1.0" },
    });
    const latest = await resolver.resolveDownload("26.3", context());
    expect(latest.vars).toEqual({ FORGE_BUILD: "26.3-66.1.8" });
  });

  test("a pinned build wins", async () => {
    const spec = await resolver.resolveDownload(
      "1.21.1",
      context({ FORGE_VERSION: "52.0.40" }),
    );
    expect(spec.vars).toEqual({ FORGE_BUILD: "1.21.1-52.0.40" });
  });

  test("no build for the version is an error", async () => {
    const outcome = await resolver.resolveDownload("1.18", context()).then(
      () => "resolved",
      () => "rejected",
    );
    expect(outcome).toBe("rejected");
  });
});
