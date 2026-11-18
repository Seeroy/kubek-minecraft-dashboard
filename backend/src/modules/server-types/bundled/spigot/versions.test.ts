import type { VersionResolverContext } from "@kubekpanel/blueprint-sdk";
import { describe, expect, test } from "bun:test";
import { compareVersionsDesc } from "../shared/version-order";
import resolver from "./versions";

const jar = (version: string) => ({
  type: "spigot",
  version,
  fileName: `spigot-${version}.jar`,
  downloadUrl: `/spigot/spigot-${version}.jar`,
});

function context(
  spigot: object[] = ["1.8", "1.21.10", "26.3", "1.21.11", "26.1"].map(jar),
  status = 200,
): VersionResolverContext {
  return {
    variables: {},
    platform: { os: "linux", arch: "x64" },
    fetch: () =>
      Promise.resolve(
        Response.json({ spigot, craftbukkit: [jar("9.9")] }, { status }),
      ),
  };
}

describe("spigot resolver", () => {
  test("lists what getbukkit has, newest first", async () => {
    const list = await resolver.listVersions(context());
    expect(list.map((v) => v.id)).toEqual([
      "26.3",
      "26.1",
      "1.21.11",
      "1.21.10",
      "1.8",
    ]);
  });

  test("downloads from the cdn path getbukkit gives", async () => {
    expect(await resolver.resolveDownload("26.3", context())).toEqual({
      url: "https://cdn.getbukkit.org/spigot/spigot-26.3.jar",
    });
  });

  test("a version getbukkit doesn't have is an error", async () => {
    const outcome = await resolver.resolveDownload("1.21", context()).then(
      () => "resolved",
      () => "rejected",
    );
    expect(outcome).toBe("rejected");
  });

  test("an empty or failed list is an error, not an empty select", async () => {
    for (const ctx of [context([]), context(undefined, 502)]) {
      const outcome = await resolver.listVersions(ctx).then(
        () => "resolved",
        () => "rejected",
      );
      expect(outcome).toBe("rejected");
    }
  });
});

test("compareVersionsDesc sorts by numbers, not text", () => {
  expect(
    ["1.9", "1.21.10", "26.1", "1.21.9"].sort(compareVersionsDesc),
  ).toEqual(["26.1", "1.21.10", "1.21.9", "1.9"]);
});
