import { describe, expect, test } from "bun:test";
import { daemonPlatform, dockerPlatformMatches } from "./docker-platform";

describe("daemonPlatform", () => {
  test("maps docker info architectures to image platform names", () => {
    expect(daemonPlatform("linux", "x86_64")).toBe("linux/amd64");
    expect(daemonPlatform("linux", "aarch64")).toBe("linux/arm64");
    expect(daemonPlatform("linux", "armv7l")).toBe("linux/arm/v7");
    expect(daemonPlatform("linux", "s390x")).toBe("linux/s390x");
    expect(daemonPlatform(undefined, "x86_64")).toBeUndefined();
  });
});

describe("dockerPlatformMatches", () => {
  test("no list or an unknown daemon allows docker", () => {
    expect(dockerPlatformMatches(undefined, "linux/arm64")).toBe(true);
    expect(dockerPlatformMatches([], "linux/arm64")).toBe(true);
    expect(dockerPlatformMatches(["linux/amd64"], undefined)).toBe(true);
  });

  test("the daemon platform has to be in the list", () => {
    expect(dockerPlatformMatches(["linux/amd64"], "linux/amd64")).toBe(true);
    expect(dockerPlatformMatches(["linux/amd64"], "linux/arm64")).toBe(false);
    expect(dockerPlatformMatches(["linux/arm"], "linux/arm/v7")).toBe(true);
    expect(dockerPlatformMatches(["linux/arm/v7"], "linux/arm")).toBe(true);
    expect(dockerPlatformMatches(["linux/arm/v6"], "linux/arm/v7")).toBe(false);
  });
});
