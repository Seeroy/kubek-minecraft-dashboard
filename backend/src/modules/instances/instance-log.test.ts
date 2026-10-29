import { describe, expect, test } from "bun:test";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { fake } from "@/testing/fake";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { ServerStatus } from "@shared/types/server/server.types";
import { InstanceLog, normalizeLine } from "./instance-log";
import { StatusDetector } from "./status-detector";

describe("normalizeLine", () => {
  test("drops a CRLF ending without wiping the line", () => {
    expect(normalizeLine("Done (1s)!\r")).toEqual({
      display: "Done (1s)!",
      clean: "Done (1s)!",
    });
  });

  test("keeps only the last paint of an in-line repaint", () => {
    expect(normalizeLine("50%\r100%")?.display).toBe("100%");
  });

  test("strips ANSI for matching but keeps it for display", () => {
    const line = normalizeLine("\u001b[32mhello\u001b[0m");
    expect(line?.display).toBe("\u001b[32mhello\u001b[0m");
    expect(line?.clean).toBe("hello");
  });

  test("skips blank lines and the JLine prompt echo", () => {
    expect(normalizeLine("   ")).toBeNull();
    expect(normalizeLine("\u001b[0m")).toBeNull();
    expect(normalizeLine("> say hi")).toBeNull();
    expect(normalizeLine(">")).toBeNull();
  });
});

describe("InstanceLog", () => {
  test("holds a half line until its newline", () => {
    const log = new InstanceLog(() => {});
    expect(log.feed("hel")).toEqual([]);
    expect(log.feed("lo\nwor")).toEqual(["hello"]);
    expect(log.flush()).toBe("wor");
    expect(log.flush()).toBeNull();
  });

  test("keeps the last 100 entries and reports every write", () => {
    const seen: IInstanceLog[] = [];
    const log = new InstanceLog((entry) => seen.push(entry));
    for (let i = 0; i < 150; i++) log.write(`line ${i}`);
    expect(seen).toHaveLength(150);
    expect(log.get()).toHaveLength(100);
    expect(log.get()[0].line).toBe("line 50");
    expect(log.get()[99].type).toBe("stdout");
  });
});

describe("StatusDetector", () => {
  test("falls back to the legacy minecraft patterns", () => {
    const detector = new StatusDetector(undefined);
    expect(detector.detect("Starting minecraft server version 1.21")).toBe(
      ServerStatus.STARTING,
    );
    expect(detector.detect("Done (3.2s)! For help, type help")).toBe(
      ServerStatus.RUNNING,
    );
    expect(detector.detect("Stopping the server")).toBe(ServerStatus.STOPPING);
    expect(detector.detect("Player joined")).toBeNull();
  });

  test("uses blueprint patterns and finds the last status", () => {
    const detector = new StatusDetector(
      fake<KubekBlueprintManifest>({
        detection: { starting: ["^boot"], running: ["^ready$"], stopping: [] },
      }),
    );
    expect(detector.detect("Done (1s)! For help")).toBeNull();
    expect(detector.detect("  READY  ")).toBe(ServerStatus.RUNNING);
    expect(detector.last(["boot", "ready", "chat"])).toBe(ServerStatus.RUNNING);
    expect(detector.last(["chat"])).toBeUndefined();
  });
});
