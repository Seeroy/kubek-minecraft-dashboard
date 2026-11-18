import { describe, expect, test } from "bun:test";
import {
  parseSteamCmdProgress,
  steamCmdArgs,
  steamCmdBundle,
} from "./steamcmd.service";

describe("steamCmdArgs", () => {
  test("anonymous app_update with validate by default", () => {
    expect(steamCmdArgs({ appId: "896660" }, "/srv/valheim")).toEqual([
      "+force_install_dir",
      "/srv/valheim",
      "+login",
      "anonymous",
      "+app_update",
      "896660",
      "validate",
      "+quit",
    ]);
  });

  test("platform goes before the login, branch after the app", () => {
    const args = steamCmdArgs(
      {
        appId: "2394010",
        platform: "windows",
        beta: "experimental",
        betaPassword: "s3cret!",
        validate: false,
      },
      "/srv/pal",
    );
    expect(args.slice(0, 2)).toEqual([
      "+@sSteamCmdForcePlatformType",
      "windows",
    ]);
    expect(args.indexOf("+@sSteamCmdForcePlatformType")).toBeLessThan(
      args.indexOf("+login"),
    );
    expect(args).toContain("experimental");
    expect(args).toContain("s3cret!");
    expect(args).not.toContain("validate");
  });

  test("rejects values that are not plain tokens", () => {
    expect(() => steamCmdArgs({ appId: "896660 +quit" }, "/x")).toThrow(
      "Invalid Steam app id",
    );
    expect(() =>
      steamCmdArgs({ appId: "1", beta: "x +login root" }, "/x"),
    ).toThrow("Invalid Steam branch");
    expect(() =>
      steamCmdArgs({ appId: "1", betaPassword: "a b" }, "/x"),
    ).toThrow("Invalid Steam branch password");
  });
});

describe("parseSteamCmdProgress", () => {
  test("reads the phase and percent", () => {
    expect(
      parseSteamCmdProgress(
        " Update state (0x61) downloading, progress: 45.12 (123 / 456)",
      ),
    ).toEqual({ phase: "downloading", percent: 45.12 });
    expect(
      parseSteamCmdProgress(
        " Update state (0x81) verifying update, progress: 3.50 (1 / 2)",
      ),
    ).toEqual({ phase: "verifying update", percent: 3.5 });
  });

  test("other lines are not progress", () => {
    expect(
      parseSteamCmdProgress("Success! App '896660' fully installed."),
    ).toBe(null);
  });
});

describe("steamCmdBundle", () => {
  test("picks the archive per OS", () => {
    expect(steamCmdBundle("win32", "arm64").binary).toBe("steamcmd.exe");
    expect(steamCmdBundle("linux", "x64").archive).toBe(
      "steamcmd_linux.tar.gz",
    );
    expect(steamCmdBundle("darwin", "arm64").archive).toBe(
      "steamcmd_osx.tar.gz",
    );
  });

  test("ARM Linux has no SteamCMD", () => {
    expect(() => steamCmdBundle("linux", "arm64")).toThrow("x86-64");
  });
});
