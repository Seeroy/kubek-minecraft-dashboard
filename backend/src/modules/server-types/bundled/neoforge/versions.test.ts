import type { VersionResolverContext } from "@kubekpanel/blueprint-sdk";
import { describe, expect, test } from "bun:test";
import resolver, { minecraftFor, pickBuild } from "./versions";

const BUILDS = [
  "20.4.80-beta",
  "21.0.5-beta",
  "21.1.76",
  "21.1.77",
  "21.1.100-beta",
  "0.25w14craftmine.3-beta",
  "26.1.2.127",
  "26.3.0.109",
  "26.3.0.110-beta",
];

function context(
  variables: VersionResolverContext["variables"] = {},
): VersionResolverContext {
  const xml = BUILDS.map((v) => `<version>${v}</version>`).join("");
  return {
    variables,
    platform: { os: "linux", arch: "x64" },
    fetch: () => Promise.resolve(new Response(`<versions>${xml}</versions>`)),
  };
}

describe("neoforge minecraftFor", () => {
  test("maps both numbering schemes", () => {
    expect(minecraftFor("21.1.77")).toBe("1.21.1");
    expect(minecraftFor("21.0.5-beta")).toBe("1.21");
    expect(minecraftFor("26.3.0.110")).toBe("26.3");
    expect(minecraftFor("26.1.2.127")).toBe("26.1.2");
    expect(minecraftFor("0.25w14craftmine.3-beta")).toBe(null);
  });
});

describe("neoforge resolver", () => {
  test("lists game versions newest first", async () => {
    const list = await resolver.listVersions(context());
    expect(list.map((v) => v.id)).toEqual([
      "26.3",
      "26.1.2",
      "1.21.1",
      "1.21",
      "1.20.4",
    ]);
  });

  test("a stable build beats a newer beta", () => {
    expect(pickBuild(BUILDS, "1.21.1")).toBe("21.1.77");
    expect(pickBuild(BUILDS, "26.3")).toBe("26.3.0.109");
    expect(pickBuild(BUILDS, "1.21")).toBe("21.0.5-beta");
  });

  test("hands the build to the install steps", async () => {
    const spec = await resolver.resolveDownload("1.21.1", context());
    expect(spec).toEqual({
      url: "https://maven.neoforged.net/releases/net/neoforged/neoforge/21.1.77/neoforge-21.1.77-installer.jar",
      vars: { NEOFORGE_BUILD: "21.1.77" },
    });
  });

  test("a pinned build wins, a bad one is rejected", async () => {
    const pinned = await resolver.resolveDownload(
      "1.21.1",
      context({ NEOFORGE_VERSION: "21.1.76" }),
    );
    expect(pinned.vars).toEqual({ NEOFORGE_BUILD: "21.1.76" });
    const outcome = await resolver
      .resolveDownload("1.21.1", context({ NEOFORGE_VERSION: "1; rm" }))
      .then(
        () => "resolved",
        () => "rejected",
      );
    expect(outcome).toBe("rejected");
  });
});
