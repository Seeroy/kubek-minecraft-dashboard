import { afterAll, describe, expect, it } from "bun:test";
import { rmdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { Capability } from "@kubekpanel/extension-sdk";
import { ExtensionEventBus } from "../extension-event-bus.service";
import type { ExtensionRecord } from "../extensions.types";
import { CapabilityDeniedError } from "../extensions.types";
import { ContextFactory } from "./context.factory";

const ID = "test.ctx.factory";

afterAll(() => {
  rmSync(resolve("extensions", ".data", ID), { recursive: true, force: true });
  // Only when the test made them, a real install keeps its folders
  for (const dir of [resolve("extensions", ".data"), resolve("extensions")]) {
    try {
      rmdirSync(dir);
    } catch {
      // not empty or not there
    }
  }
});

function setup(caps: Capability[], saved: Record<string, unknown> = {}) {
  const bus = new ExtensionEventBus({ findById: () => null } as unknown as ServersRepository);
  const kv = { get: () => saved, set: () => {} };
  const factory = new ContextFactory(
    bus,
    { findById: () => null } as never,
    { has: () => false } as never,
    kv as never,
    { record: () => {} } as never,
    {} as never,
  );
  const record = {
    id: ID,
    version: "1.0.0",
    manifest: {
      name: "Test",
      settingsSchema: [{ key: "mode", type: "select", label: "Mode", options: ["a", "b"], default: "a" }],
    },
    grantedCapabilities: caps,
  } as unknown as ExtensionRecord;
  const dispose: Array<() => void> = [];
  const ctx = factory.build(record, {
    dispose,
    registerRoutes: () => {},
    registerCommand: () => {},
  });
  return { bus, ctx, dispose };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("extension context", () => {
  it("emit only takes ext.* names", () => {
    const { ctx } = setup([]);
    expect(() => ctx.events.emit("server.started" as never, {})).toThrow('must start with "ext."');
    expect(() => ctx.events.emit("ext.test.ping", 1)).not.toThrow();
  });

  it("ext.* events need no capability and stop on dispose", async () => {
    const { ctx, bus, dispose } = setup([]);
    const seen: unknown[] = [];
    ctx.events.on("ext.other.ping", (p) => seen.push(p));
    bus.emitCustom("ext.other.ping", 1);
    await flush();
    dispose.forEach((fn) => fn());
    bus.emitCustom("ext.other.ping", 2);
    await flush();
    expect(seen).toEqual([1]);
  });

  it("panel events still need their capability, unknown ones throw", () => {
    const { ctx } = setup([]);
    expect(() => ctx.events.on("server.log", () => {})).toThrow(CapabilityDeniedError);
    expect(() => ctx.events.on("nope" as never, () => {})).toThrow('Unknown event "nope"');
  });

  it("onLog needs events:logs and goes away on dispose", async () => {
    expect(() => setup(["servers:read"]).ctx.servers.onLog("s1", () => {})).toThrow(
      'lacks capability "events:logs"',
    );
    const { ctx, bus, dispose } = setup(["servers:read", "events:logs"]);
    const lines: unknown[] = [];
    ctx.servers.onLog("s1", (line) => lines.push(line.line));
    expect(dispose).toHaveLength(1);
    const log = (line: string) =>
      bus.publish("server.log", { serverId: "s1", line: { type: "stdout", timestamp: "", line } });
    log("one");
    await flush();
    dispose.forEach((fn) => fn());
    log("two");
    await flush();
    expect(lines).toEqual(["one"]);
  });

  it("config falls back to the schema default", () => {
    expect(setup(["settings"]).ctx.config.get("mode")).toBe("a");
    expect(setup(["settings"], { mode: "b" }).ctx.config.get("mode")).toBe("b");
    expect(setup(["settings"]).ctx.config.all()).toEqual({ mode: "a" });
  });
});
