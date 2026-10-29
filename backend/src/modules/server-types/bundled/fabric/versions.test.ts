import type { VersionResolverContext } from "@kubekpanel/blueprint-sdk";
import { describe, expect, test } from "bun:test";
import resolver from "./versions";

function context(
  variables: VersionResolverContext["variables"],
): VersionResolverContext {
  const meta: Record<string, { version: string; stable: boolean }[]> = {
    "/versions/loader": [
      { version: "0.17.0-beta", stable: false },
      { version: "0.16.14", stable: true },
    ],
    "/versions/installer": [{ version: "1.0.3", stable: true }],
  };
  return {
    variables,
    platform: { os: "linux", arch: "x64" },
    fetch: (url) => {
      const path = String(url).replace("https://meta.fabricmc.net/v2", "");
      return Promise.resolve(Response.json(meta[path] ?? []));
    },
  };
}

describe("fabric resolveDownload", () => {
  test("takes the latest stable loader by default", async () => {
    const spec = await resolver.resolveDownload("1.21.1", context({}));
    expect(spec.url).toBe(
      "https://meta.fabricmc.net/v2/versions/loader/1.21.1/0.16.14/1.0.3/server/jar",
    );
  });

  test("respects a pinned loader version", async () => {
    const spec = await resolver.resolveDownload(
      "1.20.1",
      context({ FABRIC_LOADER_VERSION: "0.15.11" }),
    );
    expect(spec.url).toContain("/loader/1.20.1/0.15.11/1.0.3/");
  });

  test("rejects a loader version that is not a plain token", async () => {
    const outcome = await resolver
      .resolveDownload("1.20.1", context({ FABRIC_LOADER_VERSION: "../../x" }))
      .then(
        () => "resolved",
        () => "rejected",
      );
    expect(outcome).toBe("rejected");
  });
});
