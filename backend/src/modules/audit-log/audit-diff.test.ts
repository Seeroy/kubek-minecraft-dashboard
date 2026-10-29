import { describe, expect, test } from "bun:test";
import { diffChanges } from "./audit-diff";

describe("diffChanges", () => {
  test("walks nested objects and keeps only changed leaves", () => {
    const changes = diffChanges(
      { port: 3000, ftpd: { enabled: false, port: 21 } },
      { port: 3000, ftpd: { enabled: true, port: 21 } },
    );
    expect(changes).toEqual([{ field: "ftpd.enabled", from: false, to: true }]);
  });

  test("compares arrays whole", () => {
    expect(diffChanges({ ids: ["a"] }, { ids: ["a", "b"] })).toEqual([
      { field: "ids", from: ["a"], to: ["a", "b"] },
    ]);
    expect(diffChanges({ ids: ["a"] }, { ids: ["a"] })).toEqual([]);
  });

  test("hides secret values", () => {
    const changes = diffChanges(
      { bot: { token: "old" } },
      { bot: { token: "new" } },
      { secrets: ["bot.token"] },
    );
    expect(changes).toEqual([{ field: "bot.token", secret: true }]);
  });

  test("skips ignored branches and treats blank as missing", () => {
    const changes = diffChanges(
      { meta: { at: 1 }, motd: "" },
      { meta: { at: 2 } },
      { ignore: ["meta"] },
    );
    expect(changes).toEqual([]);
  });

  test("records added and removed keys with labels", () => {
    const changes = diffChanges(
      { XMX: 2048 },
      { XMX: 4096, JVM_ARGS: "-Dx" },
      { labels: { XMX: "Memory (MB)" } },
    );
    expect(changes).toEqual([
      { field: "XMX", from: 2048, to: 4096, label: "Memory (MB)" },
      { field: "JVM_ARGS", from: null, to: "-Dx" },
    ]);
  });
});
