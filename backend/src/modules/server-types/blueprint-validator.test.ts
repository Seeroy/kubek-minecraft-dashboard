import { describe, expect, test } from "bun:test";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { isSafeRelativePath, validateManifest } from "./blueprint-validator";
import { BUNDLED_BLUEPRINTS } from "./bundled";

function manifest(overrides: Record<string, unknown> = {}): unknown {
  const base: KubekBlueprintManifest = {
    manifestVersion: 1,
    id: "test.core",
    name: "Test core",
    game: "test",
    version: "1.0.0",
    runtime: { kind: "native" },
    variables: [{ key: "MOTD", type: "string", default: "hello", env: "MOTD" }],
    versions: { kind: "none" },
    install: { steps: [{ type: "writeFile", path: "a.txt", content: "x" }] },
    startup: { command: "run", stop: { type: "command", value: "stop" } },
    query: { protocol: "none", port: { fromVariable: "game" } },
    ports: [{ key: "game", default: 25565, protocol: "tcp", primary: true }],
  };
  return { ...base, ...overrides };
}

const errorsOf = (overrides: Record<string, unknown>) =>
  validateManifest(manifest(overrides));

describe("validateManifest", () => {
  test("every bundled blueprint is valid", () => {
    for (const { manifest: m } of BUNDLED_BLUEPRINTS) {
      expect({ id: m.id, errors: validateManifest(m) }).toEqual({
        id: m.id,
        errors: [],
      });
    }
  });

  test("a minimal manifest is valid", () => {
    expect(validateManifest(manifest())).toEqual([]);
  });

  test("a non object is rejected", () => {
    expect(validateManifest(null)).toEqual(["manifest must be a JSON object"]);
  });

  test("missing sections are reported instead of crashing later", () => {
    const errors = errorsOf({
      variables: undefined,
      ports: "x",
      install: undefined,
      startup: undefined,
      query: undefined,
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        "variables must be an array",
        "ports must be an array",
        "install must be an object",
        "startup must be an object",
        "query must be an object",
      ]),
    );
  });

  test("the script step is rejected with a hint", () => {
    const errors = errorsOf({
      install: { steps: [{ type: "script", shell: "sh", inline: "echo" }] },
    });
    expect(errors).toEqual([
      'install.steps[0]: install step "script" is not supported, use "exec"',
    ]);
  });

  test("unknown step types and broken steps are reported", () => {
    const errors = errorsOf({
      install: {
        steps: [
          { type: "magic" },
          { type: "download", dest: "../x" },
          { type: "chmod", path: "run.sh", mode: "rwx" },
          { type: "exec" },
        ],
      },
    });
    expect(errors).toEqual([
      'install.steps[0]: unknown install step type "magic"',
      "install.steps[1].url is required",
      "install.steps[1].dest must be a relative path inside the folder",
      'install.steps[2].mode must be an octal string like "755"',
      "install.steps[3] needs command or commandByPlatform",
    ]);
  });

  test("only host install runIn is accepted", () => {
    expect(errorsOf({ install: { runIn: "host", steps: [] } })).toEqual([]);
    expect(errorsOf({ install: { runIn: "image", steps: [] } })).toEqual([
      'install.runIn "image" is not supported, only "host" is',
    ]);
    expect(
      errorsOf({ install: { runIn: "container:builder", steps: [] } }),
    ).toHaveLength(1);
  });

  test("rcon stop needs a command, a port and a password", () => {
    const ok = {
      type: "rcon",
      command: "stop",
      port: { value: 25575 },
      password: { fromVariable: "MOTD" },
    };
    expect(errorsOf({ startup: { command: "run", stop: ok } })).toEqual([]);
    expect(
      errorsOf({ startup: { command: "run", stop: { type: "rcon", password: { value: "" } } } }),
    ).toEqual([
      "startup.stop.command is required for an rcon stop",
      "startup.stop.port needs value or fromVariable",
      "startup.stop.password.value must be a non-empty string",
    ]);
    expect(
      errorsOf({
        startup: {
          command: "run",
          stop: { ...ok, port: { fromVariable: "RCON_PORT" }, password: { value: "x" } },
        },
      }),
    ).toEqual(["startup.stop.port.fromVariable RCON_PORT is not a variable or port"]);
  });

  test("native startup needs a command, docker-only does not", () => {
    const stop = { type: "signal:SIGTERM" };
    expect(errorsOf({ startup: { stop } })).toEqual([
      "startup.command or startup.commandByPlatform is required",
    ]);
    expect(
      errorsOf({ startup: { commandByPlatform: { linux: "./run" }, stop } }),
    ).toEqual([]);
    expect(
      errorsOf({
        runtime: { kind: "docker" },
        dockerProfile: { image: "img", env: {} },
        startup: { stop },
      }),
    ).toEqual([]);
  });

  test("docker runtime requires a profile", () => {
    expect(errorsOf({ runtime: { kind: "docker" } })).toEqual([
      "runtime.kind docker requires a dockerProfile",
    ]);
    expect(errorsOf({ runtime: { kind: "vm" } })).toEqual([
      "unsupported runtime.kind: vm",
    ]);
  });

  test("workingDir must stay inside the server folder", () => {
    const stop = { type: "command", value: "stop" };
    expect(
      errorsOf({ startup: { command: "run", workingDir: "bin", stop } }),
    ).toEqual([]);
    for (const workingDir of ["../up", "/abs", "a/../../b"]) {
      expect(
        errorsOf({ startup: { command: "run", workingDir, stop } }),
      ).toEqual([
        "startup.workingDir must be a relative path inside the server folder",
      ]);
    }
  });

  test("ports and variables are checked", () => {
    const errors = errorsOf({
      variables: [
        { key: "A", type: "string" },
        { key: "A", type: "color" },
      ],
      ports: [
        { key: "game", default: 70000, protocol: "sctp", primary: true },
        { key: "q", default: 1, protocol: "udp", primary: true },
      ],
    });
    expect(errors).toEqual([
      "variables[1].key A is declared twice",
      "variables[1].type must be one of string, number, boolean, enum, secret",
      "ports[0].default must be a port number 1-65535",
      "ports[0].protocol must be one of tcp, udp, tcp+udp",
      "only one port can be primary",
    ]);
  });

  test("env names the loader or the panel use are reserved", () => {
    expect(
      errorsOf({
        variables: [{ key: "A", type: "string", env: "LD_PRELOAD" }],
        ports: [{ key: "game", default: 1, protocol: "tcp", env: "PATH" }],
      }),
    ).toEqual([
      "variables[0].env LD_PRELOAD is reserved",
      "ports[0].env PATH is reserved",
    ]);
  });

  test("query must point at a known variable or port", () => {
    expect(
      errorsOf({ query: { protocol: "none", port: { fromVariable: "NOPE" } } }),
    ).toEqual(["query.port.fromVariable NOPE is not a variable or port"]);
    expect(
      errorsOf({
        query: { protocol: "gamedig:valheim", port: { value: 2457 } },
      }),
    ).toEqual([]);
    expect(
      errorsOf({ query: { protocol: "telnet", port: { value: 1 } } }),
    ).toHaveLength(1);
  });

  test("detection patterns must compile", () => {
    expect(errorsOf({ detection: { crash: ["(unclosed"] } })).toEqual([
      "detection.crash[0] is not a valid RegExp",
    ]);
  });

  test("http steps and paginate are checked", () => {
    const errors = errorsOf({
      versions: {
        kind: "http",
        list: {
          request: { url: "https://x" },
          sort: "random",
          paginate: { nextSelect: "header:link", max: 0 },
          then: { url: "" },
        },
      },
    });
    expect(errors).toEqual([
      "versions.list.sort must be one of semver-desc, semver-asc, date-desc, date-asc, none",
      "versions.list.paginate.max must be a positive integer",
      "versions.list.then.url is required",
    ]);
  });

  test("docker profile is checked", () => {
    const errors = errorsOf({
      dockerProfile: {
        env: { A: 1 },
        platforms: ["amd64"],
        mounts: [{ host: "x", container: "data" }],
        install: [{ type: "script" }],
      },
    });
    expect(errors).toEqual([
      "dockerProfile.image is required",
      "dockerProfile.env.A must be a string",
      "dockerProfile.mounts[0].container must be an absolute path",
      'dockerProfile.platforms entry "amd64" must look like linux/amd64',
      'dockerProfile.install[0]: install step "script" is not supported, use "exec"',
    ]);
  });
});

describe("isSafeRelativePath", () => {
  test("relative paths inside pass, escapes and absolute paths fail", () => {
    expect(isSafeRelativePath("config/server.toml")).toBe(true);
    expect(isSafeRelativePath("{{SERVER_JAR}}")).toBe(true);
    expect(isSafeRelativePath("..")).toBe(false);
    expect(isSafeRelativePath("a\\..\\..")).toBe(false);
    expect(isSafeRelativePath("C:\\x")).toBe(false);
    expect(isSafeRelativePath("")).toBe(false);
  });
});
