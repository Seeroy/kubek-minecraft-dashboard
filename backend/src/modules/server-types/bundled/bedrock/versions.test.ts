import type { VersionResolverContext } from "@kubekpanel/blueprint-sdk";
import { describe, expect, test } from "bun:test";
import resolver from "./versions";

const LIST = {
  cdn_root: "https://www.minecraft.net/bedrockdedicatedserver",
  linux: {
    stable: "1.21.51.02",
    versions: ["1.21.50.10", "1.21.51.01", "1.21.51.02"],
    preview_versions: ["1.21.60.21"],
  },
  windows: {
    stable: "1.21.51.02",
    versions: ["1.21.51.01", "1.21.51.02"],
    preview_versions: ["1.21.60.21"],
  },
};

function context(
  os: VersionResolverContext["platform"]["os"],
  status = 200,
): VersionResolverContext {
  return {
    variables: {},
    platform: { os, arch: "x64" },
    fetch: () => Promise.resolve(Response.json(LIST, { status })),
  };
}

describe("bedrock listVersions", () => {
  test("lists stable server builds of the host OS, newest first", async () => {
    const linux = await resolver.listVersions(context("linux"));
    expect(linux.map((v) => v.id)).toEqual([
      "1.21.51.02",
      "1.21.51.01",
      "1.21.50.10",
    ]);
    const windows = await resolver.listVersions(context("win32"));
    expect(windows.map((v) => v.id)).toEqual(["1.21.51.02", "1.21.51.01"]);
  });

  test("fails on a broken list instead of offering nothing", async () => {
    const outcome = await resolver.listVersions(context("linux", 502)).then(
      () => "resolved",
      () => "rejected",
    );
    expect(outcome).toBe("rejected");
  });

  test("is not offered on macOS", async () => {
    const outcome = await resolver.listVersions(context("darwin")).then(
      () => "resolved",
      () => "rejected",
    );
    expect(outcome).toBe("rejected");
  });
});

describe("bedrock resolveDownload", () => {
  test("builds the minecraft.net zip URL per OS", async () => {
    const linux = await resolver.resolveDownload(
      "1.21.51.01",
      context("linux"),
    );
    expect(linux).toEqual({
      url: "https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-1.21.51.01.zip",
      unpack: true,
    });
    const windows = await resolver.resolveDownload(
      "1.21.51.01",
      context("win32"),
    );
    expect(windows.url).toContain("/bin-win/bedrock-server-1.21.51.01.zip");
  });

  test("rejects a version that is not a plain dotted number", async () => {
    const outcome = await resolver
      .resolveDownload("../../x", context("linux"))
      .then(
        () => "resolved",
        () => "rejected",
      );
    expect(outcome).toBe("rejected");
  });
});
