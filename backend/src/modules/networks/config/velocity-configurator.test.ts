import { describe, expect, test } from "bun:test";
import {
  configureVelocity,
  velocityBindPort,
  velocityTemplate,
} from "./velocity-configurator";
import { VELOCITY_3_TEMPLATE, VELOCITY_4_TEMPLATE } from "./velocity-template";

const network = {
  mode: "modern" as const,
  servers: [
    { alias: "lobby", address: "127.0.0.1:25566" },
    { alias: "survival", address: "127.0.0.1:25567" },
  ],
  tryList: ["lobby", "survival"],
};

type Parsed = Record<string, any>;

describe.each([
  ["3.x", VELOCITY_3_TEMPLATE],
  ["4.x", VELOCITY_4_TEMPLATE],
])("configureVelocity on the %s default", (_, template) => {
  const out = configureVelocity(template, network);
  const parsed = Bun.TOML.parse(out) as Parsed;

  test("sets forwarding keys", () => {
    expect(parsed["online-mode"]).toBe(true);
    expect(parsed["player-info-forwarding-mode"]).toBe("MODERN");
    expect(parsed["forwarding-secret-file"]).toBe("forwarding.secret");
  });

  test("writes the server list and try order", () => {
    expect(parsed.servers).toEqual({
      lobby: "127.0.0.1:25566",
      survival: "127.0.0.1:25567",
      try: ["lobby", "survival"],
    });
  });

  test("drops forced hosts that point at removed servers", () => {
    expect(parsed["forced-hosts"]).toEqual({ "lobby.example.com": ["lobby"] });
    expect(out).toContain("# Configure your forced hosts here.");
  });

  test("keeps comments and unrelated settings", () => {
    expect(out).toContain(
      "# Should we authenticate players with Mojang? By default, this is on.",
    );
    expect(out.slice(out.indexOf("[advanced]"))).toBe(
      template.slice(template.indexOf("[advanced]")),
    );
    expect(parsed.bind).toBe("0.0.0.0:25565");
  });

  test("is stable when applied twice", () => {
    expect(configureVelocity(out, network)).toBe(out);
  });

  test("legacy mode", () => {
    const legacy = Bun.TOML.parse(
      configureVelocity(template, { ...network, mode: "legacy" }),
    ) as Parsed;
    expect(legacy["player-info-forwarding-mode"]).toBe("LEGACY");
  });
});

describe("template", () => {
  test("binds the given port", () => {
    expect(velocityBindPort(velocityTemplate(25577))).toBe(25577);
  });

  test("follows the Velocity major version", () => {
    const v3 = Bun.TOML.parse(velocityTemplate(1, "3.4.0")) as Parsed;
    const v4 = Bun.TOML.parse(velocityTemplate(1, "4.3.0")) as Parsed;
    expect(v3["ping-passthrough"]).toBe("DISABLED");
    expect(typeof v4["ping-passthrough"]).toBe("object");
  });

  test("reads no port from garbage", () => {
    expect(velocityBindPort("not toml [")).toBeNull();
  });
});
