import { describe, expect, test } from "bun:test";
import { TomlPatcher } from "./toml-patcher";
import {
  applyVelocitySettings,
  readVelocitySettings,
  VELOCITY_DEFAULTS,
} from "./velocity-settings";
import { VELOCITY_3_TEMPLATE, VELOCITY_4_TEMPLATE } from "./velocity-template";

describe("velocity settings", () => {
  test("defaults come from the template", () => {
    expect(VELOCITY_DEFAULTS.motd).toBe("<#09add3>A Velocity Server");
    expect(VELOCITY_DEFAULTS.showMaxPlayers).toBe(500);
    expect(VELOCITY_DEFAULTS.compressionThreshold).toBe(256);
    expect(VELOCITY_DEFAULTS.queryEnabled).toBe(false);
  });

  test("both templates read the same", () => {
    expect(readVelocitySettings(VELOCITY_3_TEMPLATE)).toEqual(
      VELOCITY_DEFAULTS,
    );
  });

  test("missing and odd values fall back", () => {
    const read = readVelocitySettings("motd = 5\nshow-max-players = 20\n");
    expect(read.motd).toBe(VELOCITY_DEFAULTS.motd);
    expect(read.showMaxPlayers).toBe(20);
  });

  test("writes values in place and reads them back", () => {
    const changed = {
      motd: 'My "network"',
      showMaxPlayers: 100,
      onlineMode: false,
      readTimeout: 60000,
      queryEnabled: true,
    };
    const out = applyVelocitySettings(
      TomlPatcher.parse(VELOCITY_4_TEMPLATE),
      changed,
    ).toString();
    expect(out.split("\n").length).toBe(VELOCITY_4_TEMPLATE.split("\n").length);
    expect(readVelocitySettings(out)).toEqual({
      ...VELOCITY_DEFAULTS,
      ...changed,
    });
  });

  test("skips values of the wrong type", () => {
    const out = applyVelocitySettings(TomlPatcher.parse(VELOCITY_4_TEMPLATE), {
      showMaxPlayers: 1.5,
    }).toString();
    expect(out).toBe(VELOCITY_4_TEMPLATE);
  });
});
