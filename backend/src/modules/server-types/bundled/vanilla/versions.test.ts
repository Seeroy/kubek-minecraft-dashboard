import type { VersionResolverContext } from "@kubekpanel/blueprint-sdk";
import { describe, expect, test } from "bun:test";
import resolver from "./versions";

const MANIFEST = {
  versions: [
    { id: "26.3", type: "release", url: "meta/26.3" },
    { id: "26.4-snapshot-1", type: "snapshot", url: "meta/snap" },
    { id: "1.2.5", type: "release", url: "meta/1.2.5" },
    { id: "1.2.4", type: "release", url: "meta/1.2.4" },
    { id: "1.0", type: "release", url: "meta/1.0" },
  ],
};

const context: VersionResolverContext = {
  variables: {},
  platform: { os: "linux", arch: "x64" },
  fetch: () => Promise.resolve(Response.json(MANIFEST)),
};

describe("vanilla listVersions", () => {
  test("stops at the first release that has a server jar", async () => {
    const list = await resolver.listVersions(context);
    expect(list.map((v) => v.id)).toEqual(["26.3", "1.2.5"]);
  });
});
