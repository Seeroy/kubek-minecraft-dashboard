import { describe, expect, test } from "bun:test";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import type { IServer } from "@shared/types/server/server.types";
import {
  LaunchCommandBuilder,
  type LaunchCommandBuilderDeps,
} from "./launch-command-builder";

const builder = new LaunchCommandBuilder({} as LaunchCommandBuilderDeps);

const target = (
  stop: unknown,
  runtimeKind: IServer["runtimeKind"] = "native",
) => ({
  serverId: "s1",
  config: { runtimeKind } as IServer,
  blueprint: { startup: { stop } } as unknown as KubekBlueprintManifest,
});

describe("LaunchCommandBuilder.stopMethod", () => {
  test("passes the blueprint stop timeout along", () => {
    expect(
      builder.stopMethod(
        target({ type: "command", value: "exit", timeoutSec: 10 }),
      ),
    ).toEqual({ type: "command", value: "exit", timeoutSec: 10 });
    expect(
      builder.stopMethod(target({ type: "signal:SIGTERM", timeoutSec: 5 })),
    ).toEqual({ type: "signal", signal: "SIGTERM", timeoutSec: 5 });
  });

  test("leaves the panel default when the timeout is missing or bad", () => {
    expect(
      builder.stopMethod(target({ type: "command", value: "stop" })).timeoutSec,
    ).toBeUndefined();
    expect(
      builder.stopMethod(
        target({ type: "command", value: "stop", timeoutSec: "10" }),
      ).timeoutSec,
    ).toBeUndefined();
  });
});
